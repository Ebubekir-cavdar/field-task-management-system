using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.API.Data;
using TaskManagement.API.DTOs;
using TaskManagement.API.Entities;
using Microsoft.AspNetCore.RateLimiting;

namespace TaskManagement.API.Controllers
{
    /// <summary>
    /// Sadece 'Admin' rolüne sahip kullanıcıların erişebildiği yönetim uç noktalarını barındıran Controller.
    /// Route: /api/v1/admin
    /// JWT Bearer Token ile yetkilendirme sağlar.
    /// </summary>
    [EnableRateLimiting("general-policy")]
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/v1/admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// İstek yapan kullanıcının Admin rolüne sahip olup olmadığını JWT claim'lerinden ve veritabanından doğrular.
        /// </summary>
        private async Task<(bool IsAdmin, User? CurrentUser)> VerifyAdminAsync()
        {
            int userId = 0;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim != null && int.TryParse(claim.Value, out int jwtId))
            {
                userId = jwtId;
            }
            else
            {
                var headerValue = Request.Headers["X-User-ID"].FirstOrDefault();
                if (!string.IsNullOrEmpty(headerValue) && int.TryParse(headerValue, out int hId))
                {
                    userId = hId;
                }
            }

            if (userId == 0)
            {
                return (false, null);
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return (false, null);
            }

            // UserID = 1 her zaman Admin kabul edilir
            if (user.UserID == 1 && user.Role != "Admin")
            {
                user.Role = "Admin";
                await _context.SaveChangesAsync();
            }

            return (user.Role == "Admin", user);
        }

        /// <summary>
        /// Sistem genelindeki istatistikleri (KPI) döner (GET /api/v1/admin/stats).
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var (isAdmin, _) = await VerifyAdminAsync();
            if (!isAdmin)
            {
                return StatusCode(403, new { message = "Bu alana erişim yetkiniz bulunmuyor. Yalnızca yöneticiler erişebilir." });
            }

            var totalTasks = await _context.Tasks.CountAsync();
            var assignedTasks = await _context.Tasks.CountAsync(t => t.Status == "ASSIGNED");
            var inProgressTasks = await _context.Tasks.CountAsync(t => t.Status == "IN_PROGRESS");
            var completedTasks = await _context.Tasks.CountAsync(t => t.Status == "COMPLETED");

            var totalUsers = await _context.Users.CountAsync();
            var workerCount = await _context.Users.CountAsync(u => u.Role == "Worker");
            var adminCount = await _context.Users.CountAsync(u => u.Role == "Admin");

            var stats = new AdminStatsResponse
            {
                TotalTasks = totalTasks,
                AssignedTasks = assignedTasks,
                InProgressTasks = inProgressTasks,
                CompletedTasks = completedTasks,
                TotalUsers = totalUsers,
                WorkerCount = workerCount,
                AdminCount = adminCount
            };

            return Ok(stats);
        }

        /// <summary>
        /// Tüm personelleri ve görev istatistiklerini listeler (GET /api/v1/admin/users).
        /// </summary>
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var (isAdmin, _) = await VerifyAdminAsync();
            if (!isAdmin)
            {
                return StatusCode(403, new { message = "Bu alana erişim yetkiniz bulunmuyor. Yalnızca yöneticiler erişebilir." });
            }

            var users = await _context.Users
                .OrderBy(u => u.UserID)
                .Select(u => new AdminUserResponse
                {
                    UserID = u.UserID,
                    Name = u.Name,
                    Surname = u.Surname,
                    Email = u.Email,
                    Role = u.Role,
                    Created_at = u.Created_at,
                    AssignedTasksCount = u.Tasks.Count,
                    CompletedTasksCount = u.Tasks.Count(t => t.Status == "COMPLETED")
                })
                .ToListAsync();

            return Ok(users);
        }

        /// <summary>
        /// Belirli bir kullanıcının rolünü günceller (PATCH /api/v1/admin/users/{userId}/role).
        /// </summary>
        [HttpPatch("users/{userId}/role")]
        public async Task<IActionResult> UpdateUserRole(int userId, [FromBody] UpdateUserRoleRequest request)
        {
            var (isAdmin, _) = await VerifyAdminAsync();
            if (!isAdmin)
            {
                return StatusCode(403, new { message = "Bu alana erişim yetkiniz bulunmuyor. Yalnızca yöneticiler erişebilir." });
            }

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Ana yönetici (UserID = 1) korunur
            if (userId == 1 && request.Role != "Admin")
            {
                return BadRequest(new { message = "Sistem kurucusu (Kullanıcı ID: 1) rolü 'Worker' olarak değiştirilemez." });
            }

            var targetUser = await _context.Users.FindAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı." });
            }

            targetUser.Role = request.Role;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Kullanıcı rolü başarıyla '{request.Role}' olarak güncellendi.",
                userId = targetUser.UserID,
                role = targetUser.Role
            });
        }

        /// <summary>
        /// Sistemdeki tüm görevleri filtreli olarak listeler (GET /api/v1/admin/tasks).
        /// </summary>
        [HttpGet("tasks")]
        public async Task<IActionResult> GetAllTasks([FromQuery] string? status, [FromQuery] int? userId)
        {
            var (isAdmin, _) = await VerifyAdminAsync();
            if (!isAdmin)
            {
                return StatusCode(403, new { message = "Bu alana erişim yetkiniz bulunmuyor. Yalnızca yöneticiler erişebilir." });
            }

            var query = _context.Tasks
                .Include(t => t.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && status.ToUpper() != "ALL")
            {
                query = query.Where(t => t.Status == status.ToUpper());
            }

            if (userId.HasValue && userId.Value > 0)
            {
                query = query.Where(t => t.UserID == userId.Value);
            }

            var tasks = await query
                .OrderByDescending(t => t.Created_at)
                .Select(t => new TaskResponse
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
                    Audio_Url = t.Audio_Url,
                    Latitude = t.Latitude,
                    Longitude = t.Longitude,
                    UserName = t.User != null ? t.User.Name : "",
                    UserSurname = t.User != null ? t.User.Surname : ""
                })
                .ToListAsync();

            return Ok(tasks);
        }

        /// <summary>
        /// Bir görevi sistemden tamamen siler (DELETE /api/v1/admin/tasks/{taskId}).
        /// </summary>
        [HttpDelete("tasks/{taskId}")]
        public async Task<IActionResult> DeleteTask(int taskId)
        {
            var (isAdmin, _) = await VerifyAdminAsync();
            if (!isAdmin)
            {
                return StatusCode(403, new { message = "Bu alana erişim yetkiniz bulunmuyor. Yalnızca yöneticiler erişebilir." });
            }

            var task = await _context.Tasks.FindAsync(taskId);
            if (task == null)
            {
                return NotFound(new { message = "Görev bulunamadı." });
            }

            // Varsa kanıt fotoğrafı fiziksel olarak silinir
            if (!string.IsNullOrEmpty(task.Proof_Image_Url))
            {
                try
                {
                    var relativePath = task.Proof_Image_Url.TrimStart('/');
                    var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativePath);
                    if (System.IO.File.Exists(fullPath))
                    {
                        System.IO.File.Delete(fullPath);
                    }
                }
                catch
                {
                    // Dosya silinirken hata olsa bile veritabanı silme işlemine devam et
                }
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Görev ve ilişkili geçmiş kayıtları başarıyla silindi.", taskId });
        }
    }
}
