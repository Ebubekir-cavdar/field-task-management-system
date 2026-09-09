using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TaskManagement.API.Entities
{
    /// <summary>
    /// Veritabanındaki 'RefreshTokens' tablosunu temsil eden Entity sınıfı.
    /// JWT Access Token yenileme (Token Rotation) işlemlerinde kullanılır.
    /// </summary>
    [Table("RefreshTokens")]
    public class RefreshToken
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int RefreshTokenID { get; set; }

        // Belirtecin ait olduğu kullanıcının ID'si
        [Required]
        public int UserID { get; set; }

        // Kriptografik olarak güvenli rastgele üretilen Refresh Token dizesi
        [Required]
        [MaxLength(200)]
        public string Token { get; set; } = string.Empty;

        // Belirtecin son geçerlilik tarihi
        [Required]
        public DateTime Expires_at { get; set; }

        // Belirtecin oluşturulma tarihi
        public DateTime Created_at { get; set; } = DateTime.UtcNow;

        // Belirteç iptal edildiyse iptal tarihi (Oturum kapatma veya Rotation)
        public DateTime? Revoked_at { get; set; }

        // Token Rotation yapıldığında bu token'ın yerine geçen yeni token
        [MaxLength(200)]
        public string? ReplacedByToken { get; set; }

        // --- Navigasyon Özellikleri ---
        [ForeignKey("UserID")]
        public User User { get; set; } = null!;

        // --- Yardımcı / Hesaplanmış Özellikler (Veritabanına yazılmaz) ---
        [NotMapped]
        public bool IsExpired => DateTime.UtcNow >= Expires_at;

        [NotMapped]
        public bool IsRevoked => Revoked_at != null;

        [NotMapped]
        public bool IsActive => !IsRevoked && !IsExpired;
    }
}
