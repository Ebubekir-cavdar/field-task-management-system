using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace TaskManagement.API.DTOs
{
    /// <summary>
    /// Yeni Görev Oluşturma İsteği DTO Sınıfı (POST /api/v1/tasks)
    /// </summary>
    public class CreateTaskRequest
    {
        [Required(ErrorMessage = "Görev başlığı zorunludur.")]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Atanacak kullanıcı (UserID) seçilmelidir.")]
        public int UserID { get; set; }
    }

    /// <summary>
    /// Görev Tamamlama İsteği DTO Sınıfı (POST /api/v1/tasks/{taskId}/complete)
    /// Multipart form-data ile gönderilen kanıt fotoğrafını tutar.
    /// </summary>
    public class CompleteTaskRequest
    {
        public IFormFile? Photo { get; set; }
    }

    /// <summary>
    /// Görev Detay ve Liste Yanıtı DTO Sınıfı.
    /// Görev bilgilerinin yanı sıra atanan personelin ad/soyad bilgilerini de istemciye sunar.
    /// </summary>
    public class TaskResponse
    {
        public int TaskID { get; set; }
        public int UserID { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? Started_at { get; set; }
        public DateTime? Completed_at { get; set; }
        public DateTime Created_at { get; set; }
        public string? Proof_Image_Url { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserSurname { get; set; } = string.Empty;
    }

    /// <summary>
    /// Görev Tarihçe Log Yanıtı DTO Sınıfı.
    /// İşlemi gerçekleştiren personelin ad/soyad ve zaman damgası bilgilerini taşır.
    /// </summary>
    public class TaskLogResponse
    {
        public int TaskLogID { get; set; }
        public int TaskID { get; set; }
        public int UserID { get; set; }
        public string Action { get; set; } = string.Empty;
        public DateTime TimeStamp { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserSurname { get; set; } = string.Empty;
    }
}

