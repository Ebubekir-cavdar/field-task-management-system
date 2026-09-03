# Eksik ve Tamamlayıcı Mimari Raporu

**Proje:** Saha Görev Yönetim Sistemi (Full-Stack MVP)  
**Tarih:** 31 Ağustos 2026 (Güncellendi: 2 Eylül 2026)  
**Doküman Amacı:** Ana mimari ve fizibilite raporunda belirtilen veritabanı şemasına ve API endpoint'lerine sadık kalınarak; raporda detaylandırılmamış uygulama, güvenlik, dosya depolama ve UI/UX detaylarının tamamlayıcı mimarisini belgelemek.

---

## 1. Mimarinin Temel Esasları ve Sadeleştirilmiş Mimari Kararı

Rapor ve Draw.io şemalarında tanımlanan şu temel bileşenler **uygulanmıştır**:

* **Mobil Katman:** React Native (Expo Framework)
  * **State Management:** Zustand
  * **Kütüphaneler:** `expo-image-picker`, `axios`
* **Backend Katmanı:** .NET 8 (C#) RESTful Web API
  * **ORM:** Entity Framework Core (`Npgsql.EntityFrameworkCore.PostgreSQL`)
  * **Güvenlik / Kimlik Doğrulama:** HTTP Header tabanlı sadeleştirilmiş kimlik doğrulaması (`X-User-ID`), `BCrypt.Net-Next`
* **Veritabanı:** PostgreSQL (`localhost:5432`)
* **Medya Saklama:** Sunucu lokal dosya sistemi (`wwwroot/uploads/tasks/`)

> **[Mimari Sadeleştirme Kararı]:** Aşırı mühendislik ve kod kalabalığını engellemek adına MVP seviyesindeki uygulamada JWT Token ve `expo-secure-store` bağımlılıkları kaldırılmış; kimlik aktarımı Axios başlığı üzerinden `X-User-ID` ile sadeleştirilmiştir.

---

## 2. Raporda Belirtilmemiş ve Tamamlanan Teknik Detaylar

### A. Veritabanı ve ORM (Entity Framework Core) Detayları
1. **Şema Sadakati:**
   * `Users` (UserID, Name, Surname, Email, PasswordHash, Created_at)
   * `Tasks` (TaskID, UserID, Title, Description, Status, Started_at, Completed_at, Created_at, Proof_Image_Url)
   * `Task_Logs` (TaskLogID, TaskID, UserID, Action, TimeStamp)
2. **Tamamlayıcı Kararlar:**
   * **Status Alanı (Enum):** `ASSIGNED`, `IN_PROGRESS`, `COMPLETED` değerlerini alır. EF Core'da `string` olarak saklanır.
   * **Action Alanı (Task_Logs):** Otomatik tetiklenen durum değişikliklerinde `CREATED`, `STARTED`, `COMPLETED` string değerlerini kaydeder.
   * **Cascade Delete & Foreign Keys:** `Task_Logs` için `TaskID` silindiğinde (görev silindiğinde) ilgili logların otomatik temizlenmesi (Cascade) EF Core Fluent API ile tanımlanmıştır.
   * **Tarih Formatı:** Tüm `Timestamp` ve `Created_at` alanları UTC formatında (`DateTime.UtcNow`) varsayılan olarak atanır.

### B. Güvenlik ve Kimlik Doğrulama Yapılandırması
1. **Kimlik Doğrulama (Sadeleştirilmiş Header):** 
   * İstek atan kullanıcının `UserID` bilgisi HTTP isteğinin `X-User-ID` başlığından (Header) okunur.
2. **Kullanıcı Kaydı ve Şifreleme:**
   * `Register` endpoint'ine gelen ham şifre `BCrypt.Net.BCrypt.HashPassword(password)` ile hash'lenerek `PasswordHash` sütununa yazılır.
   * `Login` sırasında `BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)` kontrolü yapılır.

### C. Medya Saklama ve Dosya Yönetimi
1. **Benzersiz Dosya İsimlendirme:**
   * Raporda geçen `/uploads/tasks/task_5_proof.jpg` biçimi baz alınarak çakışmaları ve önbellek (cache) sorunlarını önlemek amacıyla fiziksel dosya ismi `task_{taskId}_{timestamp}_{guid}.jpg` olarak oluşturulur.
2. **Statik Dosya Sunumu (Static File Middleware):**
   * .NET 8 `Program.cs` içerisinde `app.UseStaticFiles()` aktifleştirilir ve `wwwroot/uploads/tasks/` klasörü dış erişime açılır.
   * API yanıtlarında `Proof_Image_Url` alanı `/uploads/tasks/task_5_16928374_guid.jpg` olarak istemciye döner. İstemci Base URL ile birleştirir.
3. **Görsel Sıkıştırma (Mobil Tarafı):**
   * Mobil uygulamada `expo-image-picker` ile fotoğraf çekilirken `quality: 0.7` ve `allowsEditing: true` parametreleri kullanılarak sunucuya gereksiz büyük dosya gönderilmesi engellenir.

### D. CORS ve Ağ Bağlantı Politikası
1. **CORS:** 
   * Mobil uygulamanın (Expo) geliştirme aşamasındaki dinamik IP adreslerinden gelen HTTP/HTTPS isteklerini engelleyen CORS politikaları yerine `AllowAnyOrigin`, `AllowAnyHeader`, `AllowAnyMethod` geliştirme profili tanımlanmıştır.
2. **Local IP & Host:**
   * Mobil cihazın `.NET API`'ye erişimi için `appsettings.json` Kestrel sunucusu `http://0.0.0.0:5000` adresi üzerinde dinlemeye ayarlanır.

### E. Mobil Ekranlar ve UI/UX Akışı
Mobil uygulamada raporlanan 8 API uç noktası şu 4 ana ekranda işlevselleştirilmiştir:
1. **Giriş ve Kayıt Ekranı (AuthScreen):** `POST /api/v1/auth/login` ve `POST /api/v1/auth/register`. Başarılı girişte kullanıcı bilgisi Zustand `authStore` içine kaydedilir.
2. **Görev Listem Ekranı (MyTasksScreen):** `GET /api/v1/tasks/my-tasks`. Giriş yapan kullanıcının üzerine atanan görevleri kart yapısında gösterir. 
3. **Görev Detay ve Aksiyon Ekranı (TaskDetailScreen):** `GET /api/v1/tasks/{taskId}`.
   * Görev `ASSIGNED` durumundaysa: "Görevi Başlat" butonu -> `PATCH /api/v1/tasks/{taskId}/start`
   * Görev `IN_PROGRESS` durumundaysa: Kamera butonu ile fotoğraf çekilir -> `POST /api/v1/tasks/{taskId}/complete` (multipart/form-data)
4. **Görev Geçmişi / Log Ekranı (TaskLogsScreen):** `GET /api/v1/tasks/{taskId}/logs`. İlgili görevin zaman sıralı tüm hareketlerini listeler.
5. **Görev Oluşturma Modalı/Ekranı (CreateTaskScreen):** `POST /api/v1/tasks`. MVP kapsamında bir personelin yeni bir görev tanımlayabilmesi için eklenmiştir.

---

## 3. Doğrulanmış Ortam Bilgileri

* **.NET SDK:** 8.0.424
* **Node.js:** v24.14.0
* **npm:** 11.9.0
* **PostgreSQL:** PostgreSQL 18.6 (`localhost:5432`, Kullanıcı: `postgres`)

