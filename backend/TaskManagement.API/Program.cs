using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using TaskManagement.API.Data;

using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using TaskManagement.API.Services;

// WebApplicationBuilder örneği oluşturulur. Bu nesne uygulama servislerini (DI) ve konfigürasyonu yönetir.
var builder = WebApplication.CreateBuilder(args);

// 1. Veritabanı Bağlantısı (DbContext) Ekleme:
// appsettings.json dosyasından "DefaultConnection" bağlantı dizesi çekilir ve PostgreSQL/EF Core servisi kaydedilir.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. JWT Servisi ve Kimlik Doğrulama (Authentication) Yapılandırması:
builder.Services.AddScoped<JwtService>();

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "SUPER_SECRET_KEY_FOR_SAHA_GOREV_YONETIM_SISTEMI_MVP_2026!";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 3. CORS (Cross-Origin Resource Sharing) Politikası Tanımlama:
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

// 4. Swagger Dokümantasyon ve JWT Yetkilendirme Arayüzü Konfigürasyonu:
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TaskManagement.API", Version = "v1" });

    // Swagger UI üzerinde Bearer token ile istek atmayı sağlayan Authorize butonu
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization başlığı. 'Bearer {token}' formatında giriniz.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 5. Rate Limiting (İstek Hız Sınırı) Altyapısı Konfigürasyonu:
builder.Services.AddRateLimiter(options =>
{
    // A) Giriş ve Kayıt (Auth) Politikası: 4 denemeden sonra 5. denemede kilitler (Brute-force koruması)
    options.AddPolicy("auth-policy", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-client";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: clientIp,
            factory: partition => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 4,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    // B) Genel API Politikası: IP başına dakikada en fazla 100 istek (DDoS & spam koruması)
    options.AddPolicy("general-policy", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-client";
        return RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: clientIp,
            factory: partition => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4,
                QueueLimit = 0
            });
    });

    // Sınır aşıldığında istemciye dönecek özel HTTP 429 yanıtı
    options.OnRejected = async (context, cancellationToken) =>
    {
        var clientIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        Console.WriteLine($"[RATE LIMIT ENGELİ] IP: {clientIp} sınır aşıldı! HTTP 429 dönülüyor.");

        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        var retryAfter = 60;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retrySpan))
        {
            retryAfter = Math.Max(1, (int)retrySpan.TotalSeconds);
        }

        var responseData = new
        {
            message = $"Çok fazla deneme yaptınız. Lütfen {retryAfter} saniye sonra tekrar deneyiniz.",
            retryAfterSeconds = retryAfter
        };

        await context.HttpContext.Response.WriteAsJsonAsync(responseData, cancellationToken);
    };
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

// Rate Limiting Middleware: Sınır aşımlarında da CORS başlıklarını korumak için CORS'tan hemen sonra çalışır.
app.UseRateLimiter();

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

// JWT Kimlik Doğrulama ve Yetkilendirme Middleware'leri
app.UseAuthentication();
app.UseAuthorization();

// Controller yönlendirmelerini (Route) eşleştirir.
app.MapControllers();

// Başlangıç Kontrolü: UserID = 1 kullanıcısının rolünün 'Admin' olduğundan emin olunur
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var userOne = db.Users.FirstOrDefault(u => u.UserID == 1);
    if (userOne != null && userOne.Role != "Admin")
    {
        userOne.Role = "Admin";
        db.SaveChanges();
    }

    // Mevcut AMR ses kayıtlarının .wav sürümlerine güncellenmesi (Tarayıcı uyumluluğu için)
    var tasksWithM4a = db.Tasks.Where(t => t.Audio_Url != null && t.Audio_Url.EndsWith(".m4a")).ToList();
    bool updated = false;
    foreach (var taskItem in tasksWithM4a)
    {
        var wavPath = taskItem.Audio_Url.Substring(0, taskItem.Audio_Url.Length - 4) + ".wav";
        var physicalWav = Path.Combine(wwwrootPath, wavPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(physicalWav))
        {
            taskItem.Audio_Url = wavPath;
            updated = true;
        }
    }
    if (updated)
    {
        db.SaveChanges();
    }
}

// Uygulamayı başlatır ve dinlemeye alır.
app.Run();


