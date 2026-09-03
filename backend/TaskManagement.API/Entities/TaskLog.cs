using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TaskManagement.API.Entities
{
    /// <summary>
    /// Veritabanındaki 'Task_Logs' (Görev Hareket Geçmişi) tablosunu temsil eden Entity sınıfı.
    /// Görevlerin ne zaman oluşturulduğu, başlatıldığı ve tamamlandığı gibi adımların iz kaydını (Audit Log) tutar.
    /// </summary>
    [Table("Task_Logs")]
    public class TaskLog
    {
        // Log kaydının benzersiz birincil anahtarı (Primary Key).
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int TaskLogID { get; set; }

        // İşlemin yapıldığı Görev ID'si (Foreign Key).
        [Required]
        public int TaskID { get; set; }

        // İşlemi gerçekleştiren Kullanıcı ID'si (Foreign Key).
        [Required]
        public int UserID { get; set; }

        // Gerçekleştirilen eylem/hareket türü: CREATED, STARTED, COMPLETED.
        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        // İşlemin gerçekleştiği tarih ve saat damgası.
        public DateTime TimeStamp { get; set; } = DateTime.UtcNow;

        // --- Navigasyon Özellikleri (EF Core İlişkileri) ---

        // Logun ait olduğu görev nesnesi.
        [ForeignKey("TaskID")]
        public TaskItem? Task { get; set; }

        // İşlemi yapan kullanıcı nesnesi.
        [ForeignKey("UserID")]
        public User? User { get; set; }
    }
}

