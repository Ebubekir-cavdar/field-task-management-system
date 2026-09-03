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
    }

    /// <summary>
    /// Giriş Başarılı Olduğunda İstemciye Dönülen Yanıt DTO Sınıfı.
    /// Sadeleştirilmiş mimaride doğrudan kullanıcı bilgilerini içerir.
    /// </summary>
    public class AuthResponse
    {
        public UserResponse User { get; set; } = null!;
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
        public DateTime Created_at { get; set; }
    }
}


