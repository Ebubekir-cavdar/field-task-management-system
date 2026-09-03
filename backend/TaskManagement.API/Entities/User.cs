using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TaskManagement.API.Entities
{
    /// <summary>
    /// Veritabanındaki 'Users' (Kullanıcılar) tablosunu temsil eden Entity sınıfı.
    /// </summary>
    [Table("Users")]
    public class User
    {
        // Kullanıcının benzersiz birincil anahtarı (Primary Key - Otomatik Artan ID).
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UserID { get; set; }

        // Kullanıcının adı (Zorunlu alan, maksimum 100 karakter).
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // Kullanıcının soyadı (Zorunlu alan, maksimum 100 karakter).
        [Required]
        [MaxLength(100)]
        public string Surname { get; set; } = string.Empty;

        // Kullanıcının sisteme giriş yaparken kullandığı e-posta adresi (Zorunlu, benzersiz).
        [Required]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        // Kullanıcının BCrypt algoritması ile hash'lenmiş güvenli şifresi.
        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        // Hesabın oluşturulma tarihi (Varsayılan olarak UTC zaman dilimi).
        public DateTime Created_at { get; set; } = DateTime.UtcNow;

        // --- Navigasyon Özellikleri (EF Core İlişkileri) ---

        // Kullanıcıya atanmış olan görevlerin koleksiyonu.
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();

        // Kullanıcının gerçekleştirdiği görev hareketlerinin (loglarının) koleksiyonu.
        public ICollection<TaskLog> TaskLogs { get; set; } = new List<TaskLog>();
    }
}

