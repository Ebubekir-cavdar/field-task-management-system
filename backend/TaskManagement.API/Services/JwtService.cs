using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TaskManagement.API.Entities;

namespace TaskManagement.API.Services
{
    /// <summary>
    /// Kullanıcı oturumları için güvenli JSON Web Token (JWT) ve Refresh Token üreten servis sınıfı.
    /// </summary>
    public class JwtService
    {
        private readonly IConfiguration _configuration;

        public JwtService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        /// <summary>
        /// Belirtilen kullanıcı için kısa ömürlü (varsayılan 15 dakika) imzalanmış JWT Access Token oluşturur.
        /// </summary>
        public string GenerateToken(User user, TimeSpan? customLifetime = null)
        {
            var secretKey = _configuration["JwtSettings:SecretKey"] 
                ?? throw new InvalidOperationException("JwtSettings:SecretKey konfigürasyonu bulunamadı.");
            var issuer = _configuration["JwtSettings:Issuer"];
            var audience = _configuration["JwtSettings:Audience"];

            var lifetime = customLifetime ?? TimeSpan.FromMinutes(15);

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Token içerisine eklenecek kimlik ve yetki bilgileri (Claims)
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, $"{user.Name} {user.Surname}"),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var expires = DateTime.UtcNow.Add(lifetime);

            var tokenDescriptor = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expires,
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
        }

        /// <summary>
        /// Kriptografik olarak güvenli 64 byte rastgele dizeden oluşan Refresh Token üretir.
        /// </summary>
        public RefreshToken GenerateRefreshToken(int userId, int daysToExpire = 30)
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            var token = Convert.ToBase64String(randomBytes);

            return new RefreshToken
            {
                UserID = userId,
                Token = token,
                Expires_at = DateTime.UtcNow.AddDays(daysToExpire),
                Created_at = DateTime.UtcNow
            };
        }
    }
}
