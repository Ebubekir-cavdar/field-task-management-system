using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.API.Data;
using TaskManagement.API.DTOs;
using TaskManagement.API.Entities;

using TaskManagement.API.Services;
using Microsoft.AspNetCore.RateLimiting;

namespace TaskManagement.API.Controllers
{
    /// <summary>
    /// Kullanıcı Kayıt (Register), Giriş (Login), Token Yenileme (Refresh) ve İptal (Revoke) işlemlerini yöneten Controller.
    /// Route: /api/v1/auth
    /// </summary>
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly JwtService _jwtService;

        // Dependency Injection ile DbContext ve JwtService nesneleri enjekte edilir.
        public AuthController(AppDbContext context, JwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        /// <summary>
        /// Yeni Kullanıcı Kaydı (POST /api/v1/auth/register)
        /// </summary>
        [EnableRateLimiting("auth-policy")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // Model validation kuralları kontrol edilir.
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // E-posta adresinin daha önce kaydedilip kaydedilmediği kontrol edilir.
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (existingUser != null)
            {
                return BadRequest(new { message = "Bu e-posta adresi ile zaten kayıtlı bir kullanıcı var." });
            }

            // Güvenlik: Kullanıcının şifresi BCrypt algoritması ile hash'lenir.
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Name = request.Name,
                Surname = request.Surname,
                Email = request.Email.ToLower(),
                PasswordHash = passwordHash,
                Role = "Worker", // Yeni kayıtlar otomatik olarak Worker atanır
                Created_at = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 15 dakikalık Access Token ve 30 günlük Refresh Token üretilir
            var accessToken = _jwtService.GenerateToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken(user.UserID, 30);

            _context.RefreshTokens.Add(refreshToken);
            await _context.SaveChangesAsync();

            return StatusCode(201, new { 
                message = "Kullanıcı kaydı başarıyla oluşturuldu.", 
                userId = user.UserID,
                token = accessToken,
                refreshToken = refreshToken.Token,
                role = user.Role
            });
        }

        /// <summary>
        /// Kullanıcı Girişi (POST /api/v1/auth/login)
        /// </summary>
        [EnableRateLimiting("auth-policy")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // E-posta adresine göre kullanıcı veritabanında aranır.
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null)
            {
                return Unauthorized(new { message = "E-posta veya şifre hatalı." });
            }

            // Girilen düz metin şifre ile veritabanındaki BCrypt hash'i karşılaştırılır.
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "E-posta veya şifre hatalı." });
            }

            // UserID = 1 her zaman Admin olmalıdır
            if (user.UserID == 1 && user.Role != "Admin")
            {
                user.Role = "Admin";
                await _context.SaveChangesAsync();
            }

            // 15 dakikalık kısa ömürlü Access Token üretilir
            var accessToken = _jwtService.GenerateToken(user);

            // Beni Hatırla seçildiyse 30 gün, seçilmediyse 1 günlük Refresh Token üretilir
            var daysToExpire = request.RememberMe ? 30 : 1;
            var refreshToken = _jwtService.GenerateRefreshToken(user.UserID, daysToExpire);

            _context.RefreshTokens.Add(refreshToken);
            await _context.SaveChangesAsync();

            var userResponse = new UserResponse
            {
                UserID = user.UserID,
                Name = user.Name,
                Surname = user.Surname,
                Email = user.Email,
                Role = user.Role,
                Created_at = user.Created_at
            };

            return Ok(new AuthResponse
            {
                Token = accessToken,
                RefreshToken = refreshToken.Token,
                User = userResponse
            });
        }

        /// <summary>
        /// Token Yenileme (POST /api/v1/auth/refresh)
        /// Token Rotation prensibiyle eski Refresh Token iptal edilir, yerine yenisi üretilir.
        /// </summary>
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var storedToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

            if (storedToken == null)
            {
                return Unauthorized(new { message = "Geçersiz veya bulunamayan refresh token." });
            }

            // Token süresi geçmiş veya önceden iptal edilmiş mi kontrol edilir
            if (!storedToken.IsActive)
            {
                return Unauthorized(new { message = "Refresh token süresi dolmuş veya iptal edilmiş. Lütfen tekrar giriş yapınız." });
            }

            // Token Rotation: Kalan süreyi koruyarak yeni bir refresh token üretilir
            var remainingDays = Math.Max(1, (int)Math.Ceiling((storedToken.Expires_at - DateTime.UtcNow).TotalDays));
            var newRefreshToken = _jwtService.GenerateRefreshToken(storedToken.UserID, remainingDays);

            // Eski token iptal edilir ve yeni token ile ilişkilendirilir
            storedToken.Revoked_at = DateTime.UtcNow;
            storedToken.ReplacedByToken = newRefreshToken.Token;

            _context.RefreshTokens.Add(newRefreshToken);
            await _context.SaveChangesAsync();

            // Yeni 15 dakikalık Access Token üretilir
            var newAccessToken = _jwtService.GenerateToken(storedToken.User);

            var userResponse = new UserResponse
            {
                UserID = storedToken.User.UserID,
                Name = storedToken.User.Name,
                Surname = storedToken.User.Surname,
                Email = storedToken.User.Email,
                Role = storedToken.User.Role,
                Created_at = storedToken.User.Created_at
            };

            return Ok(new AuthResponse
            {
                Token = newAccessToken,
                RefreshToken = newRefreshToken.Token,
                User = userResponse
            });
        }

        /// <summary>
        /// Refresh Token İptali / Çıkış (POST /api/v1/auth/revoke)
        /// Kullanıcı çıkış yaptığında token sunucu tarafında geçersiz kılınır.
        /// </summary>
        [HttpPost("revoke")]
        public async Task<IActionResult> Revoke([FromBody] RevokeTokenRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

            if (storedToken != null && storedToken.IsActive)
            {
                storedToken.Revoked_at = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Refresh token başarıyla iptal edildi." });
        }
    }
}


