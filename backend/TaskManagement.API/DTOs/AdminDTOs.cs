using System;
using System.ComponentModel.DataAnnotations;

namespace TaskManagement.API.DTOs
{
    /// <summary>
    /// Admin Dashboard genel sistem istatistikleri yanıt modeli.
    /// </summary>
    public class AdminStatsResponse
    {
        public int TotalTasks { get; set; }
        public int AssignedTasks { get; set; }
        public int InProgressTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int TotalUsers { get; set; }
        public int WorkerCount { get; set; }
        public int AdminCount { get; set; }
    }

    /// <summary>
    /// Admin paneli kullanıcı listesi ve görev istatistikleri yanıt modeli.
    /// </summary>
    public class AdminUserResponse
    {
        public int UserID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime Created_at { get; set; }
        public int AssignedTasksCount { get; set; }
        public int CompletedTasksCount { get; set; }
    }

    /// <summary>
    /// Kullanıcı rolü güncelleme istek modeli.
    /// </summary>
    public class UpdateUserRoleRequest
    {
        [Required(ErrorMessage = "Rol alanı zorunludur.")]
        [RegularExpression("^(Admin|Worker)$", ErrorMessage = "Rol sadece 'Admin' veya 'Worker' olabilir.")]
        public string Role { get; set; } = string.Empty;
    }
}
