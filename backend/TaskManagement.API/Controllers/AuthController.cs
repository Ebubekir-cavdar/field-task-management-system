using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.API.Data;
using TaskManagement.API.DTOs;
using TaskManagement.API.Entities;

namespace TaskManagement.API.Controllers
{
    /// <summary>
    /// Kullanıcı Kayıt (Register) ve Giriş (Login) işlemlerini yöneten API Controller'ı.
    /// Route: /api/v1/auth
    /// </summary>
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Dependency Injection ile DbContext nesnesi enjekte edilir.
        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Yeni Kullanıcı Kaydı (POST /api/v1/auth/register)
        /// </summary>
        /// <param name="request">Kullanıcı adı, soyadı, email ve şifre içeren model</param>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // Model validation kuralları (örn. Required alanlar) kontrol edilir.
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // E-posta adresinin daha önce kaydedilip kaydedilmediği büyük/küçük harf duyarsız kontrol edilir.
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (existingUser != null)
            {
                return BadRequest(new { message = "Bu e-posta adresi ile zaten kayıtlı bir kullanıcı var." });
            }

            // Güvenlik: Kullanıcının düz metin (plaintext) şifresi BCrypt algoritması ile hash'lenir.
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Yeni Kullanıcı Entity nesnesi oluşturulur.
            var user = new User
            {
                Name = request.Name,
                Surname = request.Surname,
                Email = request.Email.ToLower(),
                PasswordHash = passwordHash,
                Created_at = DateTime.UtcNow
            };

            // Veritabanına eklenir ve kaydedilir.
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // HTTP 201 Created statüsü ile yanıt dönülür.
            return StatusCode(201, new { message = "Kullanıcı kaydı başarıyla oluşturuldu.", userId = user.UserID });
        }

        /// <summary>
        /// Kullanıcı Girişi (POST /api/v1/auth/login)
        /// </summary>
        /// <param name="request">E-posta adresi ve şifre</param>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // E-posta adresine göre kullanıcı veritabanında aranır.
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null)
            {
                // Güvenlik için e-posta mı yoksa şifre mi yanlış bilgisi verilmez, genel mesaj dönülür.
                return Unauthorized(new { message = "E-posta veya şifre hatalı." });
            }

            // Girilen düz metin şifre ile veritabanındaki BCrypt hash'i karşılaştırılır.
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "E-posta veya şifre hatalı." });
            }

            // Şifre hash'i hariç tutularak kullanıcı bilgileri DTO yanıt modeline aktarılır.
            var userResponse = new UserResponse
            {
                UserID = user.UserID,
                Name = user.Name,
                Surname = user.Surname,
                Email = user.Email,
                Created_at = user.Created_at
            };

            // HTTP 200 OK ile Kullanıcı Bilgileri istemciye gönderilir.
            return Ok(new AuthResponse
            {
                User = userResponse
            });
        }
    }
}


