using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using TaskManagement.API.Data;

// WebApplicationBuilder örneği oluşturulur. Bu nesne uygulama servislerini (DI) ve konfigürasyonu yönetir.
var builder = WebApplication.CreateBuilder(args);

// 1. Veritabanı Bağlantısı (DbContext) Ekleme:
// appsettings.json dosyasından "DefaultConnection" bağlantı dizesi çekilir ve PostgreSQL/EF Core servisi kaydedilir.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. CORS (Cross-Origin Resource Sharing) Politikası Tanımlama:
// Mobil uygulamanın (Expo/React Native) API'ye rahatça erişebilmesi için tüm origin, header ve metodlara izin verilir.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()   // Tüm kaynaklara izin ver.
              .AllowAnyHeader()   // Tüm HTTP başlıklarına (Header) izin ver.
              .AllowAnyMethod();  // Tüm HTTP metotlarına (GET, POST, PATCH, DELETE) izin ver.
    });
});

// API Controller servislerini ve Swagger/OpenAPI keşif altyapısını kaydeder.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 3. Swagger Dokümantasyon ve Test Arayüzü Konfigürasyonu:
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TaskManagement.API", Version = "v1" });
});

// Servisler konfigüre edildikten sonra web uygulamasını derler.
var app = builder.Build();

// Swagger UI arayüzünü aktifleştirir.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TaskManagement.API v1");
});

// CORS politikasını aktifleştirir.
app.UseCors("AllowAll");

// Statik Dosyalar (Fotoğraf Yüklemeleri) İçin Klasör Yapılandırması:
// Görev tamamlanırken yüklenen kanıt fotoğraflarının saklanacağı wwwroot/uploads/tasks klasörünü oluşturur.
var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
var uploadsTasksPath = Path.Combine(wwwrootPath, "uploads", "tasks");
if (!Directory.Exists(uploadsTasksPath))
{
    Directory.CreateDirectory(uploadsTasksPath);
}

// wwwroot klasöründeki statik resim dosyalarının dış dünyadan HTTP ile erişilmesini sağlar.
app.UseStaticFiles();

// Controller yönlendirmelerini (Route) eşleştirir.
app.MapControllers();

// Uygulamayı başlatır ve dinlemeye alır.
app.Run();


