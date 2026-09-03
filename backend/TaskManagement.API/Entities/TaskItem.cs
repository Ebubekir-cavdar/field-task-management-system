using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TaskManagement.API.Entities
{
    /// <summary>
    /// Veritabanındaki 'Tasks' (Görevler) tablosunu temsil eden Entity sınıfı.
    /// Saha personelinin yapacağı görevleri ve durumlarını saklar.
    /// </summary>
    [Table("Tasks")]
    public class TaskItem
    {
        // Görevin benzersiz birincil anahtarı (Primary Key - Otomatik Artan ID).
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int TaskID { get; set; }

        // Görevin atandığı personelin Kullanıcı ID'si (Foreign Key).
        [Required]
        public int UserID { get; set; }

        // Görevin kısa ve açıklayıcı başlığı.
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        // Görevin detaylı açıklaması ve saha talimatları.
        public string Description { get; set; } = string.Empty;

        // Görevin mevcut durumu: ASSIGNED (Atandı), IN_PROGRESS (Devam Ediyor), COMPLETED (Tamamlandı).
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "ASSIGNED";

        // Görevin personel tarafından başlatıldığı tarih/saat.
        public DateTime? Started_at { get; set; }

        // Görevin tamamlandığı tarih/saat.
        public DateTime? Completed_at { get; set; }

        // Görevin sistemde oluşturulduğu tarih.
        public DateTime Created_at { get; set; } = DateTime.UtcNow;

        // Görev tamamlanırken çekilen kanıt fotoğrafının sunucudaki bağıl URL yolu (/uploads/tasks/...).
        public string? Proof_Image_Url { get; set; }

        // --- Navigasyon Özellikleri (EF Core İlişkileri) ---

        // Görevin atandığı kullanıcı nesnesi.
        [ForeignKey("UserID")]
        public User? User { get; set; }

        // Bu göreve ait geçmiş hareket kayıtlarının (logların) listesi.
        public ICollection<TaskLog> TaskLogs { get; set; } = new List<TaskLog>();
    }
}

