using System;
using System.ComponentModel.DataAnnotations;

namespace TaskManagement.API.DTOs
{
    /// <summary>
    /// Kullanıcı Kayıt İsteği DTO Sınıfı (POST /api/v1/auth/register)
    /// Yazılımcı tarafından istemciden alınacak kayıt form verilerini doğrulamak için yazılır.
    /// </summary>
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Ad alanı zorunludur.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Soyad alanı zorunludur.")]
        public string Surname { get; set; } = string.Empty;

        [Required(ErrorMessage = "E-posta alanı zorunludur.")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Şifre alanı zorunludur.")]
        [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır.")]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// Kullanıcı Giriş İsteği DTO Sınıfı (POST /api/v1/auth/login)
    /// </summary>
    public class LoginRequest
    {
        [Required(ErrorMessage = "E-posta alanı zorunludur.")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Şifre alanı zorunludur.")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Beni Hatırla seçeneği (True ise token geçerlilik süresi 30 güne uzatılır).
        /// </summary>
        public bool RememberMe { get; set; } = false;
    }

    /// <summary>
    /// Giriş Başarılı Olduğunda İstemciye Dönülen Yanıt DTO Sınıfı.
    /// Access Token (JWT), Refresh Token ve kullanıcı bilgilerini içerir.
    /// </summary>
    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty; // Kısa ömürlü JWT Access Token (15 dk)
        public string RefreshToken { get; set; } = string.Empty; // Uzun ömürlü Refresh Token
        public UserResponse User { get; set; } = null!;
    }

    /// <summary>
    /// Token Yenileme İsteği DTO Sınıfı (POST /api/v1/auth/refresh)
    /// </summary>
    public class RefreshTokenRequest
    {
        [Required(ErrorMessage = "RefreshToken alanı zorunludur.")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Token İptal İsteği DTO Sınıfı (POST /api/v1/auth/revoke)
    /// </summary>
    public class RevokeTokenRequest
    {
        [Required(ErrorMessage = "RefreshToken alanı zorunludur.")]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// İstemciye Gönderilen Güvenli Kullanıcı Bilgisi DTO Sınıfı.
    /// Şifre hash'i gibi hassas verileri gizleyerek sadece güvenli profil bilgilerini taşır.
    /// </summary>
    public class UserResponse
    {
        public int UserID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Worker";
        public DateTime Created_at { get; set; }
    }
}


