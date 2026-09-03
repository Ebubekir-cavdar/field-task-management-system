using Microsoft.EntityFrameworkCore;
using TaskManagement.API.Entities;

namespace TaskManagement.API.Data
{
    /// <summary>
    /// Entity Framework Core Veritabanı Bağlantı Sınıfı (DbContext).
    /// Veritabanı tablolarının (DbSet) C# modelleri ile eşleştirilmesini ve tablo ilişkilerini yönetir.
    /// </summary>
    public class AppDbContext : DbContext
    {
        // Constructor: Veritabanı bağlantı seçeneklerini (Options - örn. PostgreSQL bağlantı dizesi) üst sınıfa aktarır.
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Veritabanındaki 'Users' tablosunu temsil eden DbSet.
        public DbSet<User> Users { get; set; } = null!;

        // Veritabanındaki 'Tasks' tablosunu temsil eden DbSet.
        public DbSet<TaskItem> Tasks { get; set; } = null!;

        // Veritabanındaki 'Task_Logs' (Görev Hareketleri) tablosunu temsil eden DbSet.
        public DbSet<TaskLog> TaskLogs { get; set; } = null!;

        /// <summary>
        /// Veritabanı tabloları oluşturulurken çalışacak özel Fluent API konfigürasyonları.
        /// </summary>
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Kullanıcı Email Alanına Benzersiz (Unique) İndeks Tanımlama:
            // Aynı e-posta adresi ile birden fazla kullanıcının kaydolmasını veritabanı seviyesinde engeller.
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // 2. Task (Görev) - User (Kullanıcı) İlişkisi:
            // Bir görevin tek bir atanan kullanıcısı (User) vardır; bir kullanıcının birden fazla görevi (Tasks) olabilir.
            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.User)
                .WithMany(u => u.Tasks)
                .HasForeignKey(t => t.UserID);

            // 3. TaskLog (Görev Logu) - Task (Görev) İlişkisi:
            // Bir log kaydı tek bir göreve aittir; bir görevin çok sayıda tarihçe logu (TaskLogs) olabilir.
            // OnDelete(DeleteBehavior.Cascade): Görev silindiğinde buna bağlı loglar da veritabanından otomatik silinir.
            modelBuilder.Entity<TaskLog>()
                .HasOne(tl => tl.Task)
                .WithMany(t => t.TaskLogs)
                .HasForeignKey(tl => tl.TaskID)
                .OnDelete(DeleteBehavior.Cascade);

            // 4. TaskLog (Görev Logu) - User (İşlemi Yapan Kullanıcı) İlişkisi:
            // Log kaydında işlemi gerçekleştiren kullanıcının bilgisi tutulur.
            modelBuilder.Entity<TaskLog>()
                .HasOne(tl => tl.User)
                .WithMany(u => u.TaskLogs)
                .HasForeignKey(tl => tl.UserID);

        }
    }
}

