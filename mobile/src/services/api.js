import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Axios HTTP İstemcisi Yapılandırması:
 * Backend API sunucusu ile iletişim kurmak için merkezi konfigürasyon nesnesi.
 */
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`, // API ana adresi (config.js'ten dinamik olarak gelir)
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 saniye zaman aşımı süresi
});

/**
 * Request Interceptor (İstek Öncesi Arayazılım):
 * Her HTTP isteğinde Zustand AuthStore'daki JWT token'ı Authorization Bearer başlığı olarak ekler,
 * ayrıca geriye dönük uyumluluk için X-User-ID başlığını da ekler.
 */
api.interceptors.request.use((config) => {
  try {
    // Zustand Auth Store'dan mevcut token ve kullanıcıyı al
    const { useAuthStore } = require('../store/useAuthStore');
    const { token, user } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (user && user.userID) {
      config.headers['X-User-ID'] = user.userID.toString();
    }
  } catch (e) {
    // Döngüsel bağımlılık durumunda sessizce geç
  }
  return config;
});

// Silent refresh için kuyruk ve durum değişkenleri
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Response Interceptor (Yanıt Sonrası Arayazılım):
 * Sunucudan gelen yanıtları ve dönen HTTP hatalarını (400, 401, 429, 500 vb.) yakalar.
 * 401 Unauthorized durumunda Refresh Token ile sessizce yeni token alır (Silent Refresh)
 * ve başarısız olan isteği otomatik olarak tekrarlar.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized yakalandığında
    if (error.response?.status === 401 && originalRequest) {
      const url = originalRequest.url || '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/revoke');

      // Eğer istek bir auth isteğiyse veya zaten bir kez tekrar denendiyse yenileme yapma
      if (isAuthEndpoint || originalRequest._retry) {
        if (!isAuthEndpoint) {
          try {
            const { useAuthStore } = require('../store/useAuthStore');
            useAuthStore.getState().logout();
          } catch (e) {}
        }
        const message = error.response?.data?.message || 'Yetkilendirme hatası (401).';
        return Promise.reject(new Error(message));
      }

      // Halihazırda bir refresh işlemi devam ediyorsa, bu isteği kuyruğa ekle
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { useAuthStore } = require('../store/useAuthStore');
        const newAccessToken = await useAuthStore.getState().refreshAccessToken();

        // Bekleyen kuyruktaki tüm isteklere yeni token'ı ver
        processQueue(null, newAccessToken);

        // Orijinal isteğin başlığını güncelle ve tekrar gönder
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 429 Too Many Requests (Rate Limit Sınırı Aşıldı)
    if (error.response?.status === 429) {
      const retryAfterSeconds = error.response?.data?.retryAfterSeconds || 60;
      const rateLimitMessage =
        error.response?.data?.message ||
        `Çok fazla deneme yaptınız. Lütfen ${retryAfterSeconds} saniye sonra tekrar deneyiniz.`;
      const customError = new Error(rateLimitMessage);
      customError.isRateLimited = true;
      customError.retryAfterSeconds = retryAfterSeconds;
      return Promise.reject(customError);
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.title ||
      'Sunucu ile iletişim kurulurken bir hata oluştu.';
    return Promise.reject(new Error(message));
  }
);

export default api;


