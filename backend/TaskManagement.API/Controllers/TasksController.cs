using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.API.Data;
using TaskManagement.API.DTOs;
using TaskManagement.API.Entities;

namespace TaskManagement.API.Controllers
{
    /// <summary>
    /// Görev yönetimi operasyonlarını (Ekleme, Listeleme, Başlatma, Fotoğraflı Tamamlama, Log Geçmişi) barındıran Controller.
    /// Route: /api/v1/tasks
    /// Sadeleştirilmiş Mimaride HTTP Header ('X-User-ID') üzerinden kullanıcı kimliği okunur.
    /// </summary>
    [ApiController]
    [Route("api/v1/tasks")]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// HTTP Başlığından ('X-User-ID') istek atan kullanıcının ID'sini okuyan yardımcı metod.
        /// </summary>
        private int GetCurrentUserId()
        {
            var headerValue = Request.Headers["X-User-ID"].FirstOrDefault();
            if (!string.IsNullOrEmpty(headerValue) && int.TryParse(headerValue, out int userId))
            {
                return userId;
            }
            // Başlık yoksa varsayılan olarak 1 (İlk kullanıcı) kabul et
            return 1;
        }

        /// <summary>
        /// TaskItem varlığını TaskResponse DTO'suna çeviren tekil yardımcı metod (Over-Engineering Engelleme).
        /// </summary>
        private static TaskResponse ToTaskResponse(TaskItem t)
        {
            return new TaskResponse
            {
                TaskID = t.TaskID,
                UserID = t.UserID,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                Started_at = t.Started_at,
                Completed_at = t.Completed_at,
                Created_at = t.Created_at,
                Proof_Image_Url = t.Proof_Image_Url,
                Latitude = t.Latitude,
                Longitude = t.Longitude,
                UserName = t.User != null ? t.User.Name : "",
                UserSurname = t.User != null ? t.User.Surname : ""
            };
        }

        /// <summary>
        /// Görev hareket kaydını (Log) veritabanına ekleyen tekil yardımcı metod.
        /// </summary>
        private async Task LogActionAsync(int taskId, int userId, string action)
        {
            var log = new TaskLog
            {
                TaskID = taskId,
                UserID = userId,
                Action = action,
                TimeStamp = DateTime.UtcNow
            };
            _context.TaskLogs.Add(log);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Yeni Görev Oluşturma (POST /api/v1/tasks)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var assignedUser = await _context.Users.FindAsync(request.UserID);
            if (assignedUser == null)
            {
                return BadRequest(new { message = "Atanmak istenen kullanıcı bulunamadı." });
            }

            var task = new TaskItem
            {
                Title = request.Title,
                Description = request.Description,
                UserID = request.UserID,
                Status = "ASSIGNED",
                Created_at = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Otomatik Log Kaydı ("CREATED")
            await LogActionAsync(task.TaskID, GetCurrentUserId(), "CREATED");

            task.User = assignedUser;
            return StatusCode(201, ToTaskResponse(task));
        }

        /// <summary>
        /// Giriş Yapan Kullanıcının Kendi Görevlerini Listeleme (GET /api/v1/tasks/my-tasks)
        /// </summary>
        [HttpGet("my-tasks")]
        public async Task<IActionResult> GetMyTasks()
        {
            int currentUserId = GetCurrentUserId();

            var tasks = await _context.Tasks
                .Include(t => t.User)
                .Where(t => t.UserID == currentUserId)
                .OrderByDescending(t => t.Created_at)
                .Select(t => ToTaskResponse(t))
                .ToListAsync();

            return Ok(tasks);
        }

        /// <summary>
        /// Belirli Bir Görevin Detayını Getirme (GET /api/v1/tasks/{taskId})
        /// </summary>
        [HttpGet("{taskId}")]
        public async Task<IActionResult> GetTaskById(int taskId)
        {
            var task = await _context.Tasks
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TaskID == taskId);

            if (task == null)
            {
                return NotFound(new { message = "Görev bulunamadı." });
            }

            return Ok(ToTaskResponse(task));
        }

        /// <summary>
        /// Görevi Başlatma (PATCH /api/v1/tasks/{taskId}/start)
        /// </summary>
        [HttpPatch("{taskId}/start")]
        public async Task<IActionResult> StartTask(int taskId)
        {
            var task = await _context.Tasks.FindAsync(taskId);
            if (task == null)
            {
                return NotFound(new { message = "Görev bulunamadı." });
            }

            task.Status = "IN_PROGRESS";
            task.Started_at = DateTime.UtcNow;

            await LogActionAsync(task.TaskID, GetCurrentUserId(), "STARTED");

            return Ok(new { message = "Görev başlatıldı (IN_PROGRESS)", taskId = task.TaskID, status = task.Status, started_at = task.Started_at });
        }

        /// <summary>
        /// Görevi Fotoğraflı Olarak Tamamlama (POST /api/v1/tasks/{taskId}/complete)
        /// </summary>
        [HttpPost("{taskId}/complete")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CompleteTask(int taskId, [FromForm] CompleteTaskRequest request)
        {
            var task = await _context.Tasks.FindAsync(taskId);
            if (task == null)
            {
                return NotFound(new { message = "Görev bulunamadı." });
            }

            var photo = request.Photo;
            if (photo != null && photo.Length > 0)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "tasks");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var fileExtension = Path.GetExtension(photo.FileName);
                if (string.IsNullOrEmpty(fileExtension)) fileExtension = ".jpg";

                var fileName = $"task_{taskId}_{DateTime.UtcNow.Ticks}_{Guid.NewGuid().ToString().Substring(0, 8)}{fileExtension}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await photo.CopyToAsync(stream);
                }

                task.Proof_Image_Url = $"/uploads/tasks/{fileName}";
            }

            if (!string.IsNullOrWhiteSpace(request.Latitude) && double.TryParse(request.Latitude.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double parsedLat))
            {
                task.Latitude = parsedLat;
            }
            if (!string.IsNullOrWhiteSpace(request.Longitude) && double.TryParse(request.Longitude.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double parsedLng))
            {
                task.Longitude = parsedLng;
            }

            task.Status = "COMPLETED";
            task.Completed_at = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await LogActionAsync(task.TaskID, GetCurrentUserId(), "COMPLETED");

            return Ok(new { 
                message = "Görev başarıyla tamamlandı (COMPLETED).", 
                taskId = task.TaskID, 
                status = task.Status, 
                completed_at = task.Completed_at,
                proof_Image_Url = task.Proof_Image_Url,
                latitude = task.Latitude,
                longitude = task.Longitude
            });
        }

        /// <summary>
        /// Bir Göreve Ait Tüm Geçmiş Hareket Loglarını Getirme (GET /api/v1/tasks/{taskId}/logs)
        /// </summary>
        [HttpGet("{taskId}/logs")]
        public async Task<IActionResult> GetTaskLogs(int taskId)
        {
            var logs = await _context.TaskLogs
                .Include(tl => tl.User)
                .Where(tl => tl.TaskID == taskId)
                .OrderBy(tl => tl.TimeStamp)
                .Select(tl => new TaskLogResponse
                {
                    TaskLogID = tl.TaskLogID,
                    TaskID = tl.TaskID,
                    UserID = tl.UserID,
                    Action = tl.Action,
                    TimeStamp = tl.TimeStamp,
                    UserName = tl.User != null ? tl.User.Name : "",
                    UserSurname = tl.User != null ? tl.User.Surname : ""
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}


