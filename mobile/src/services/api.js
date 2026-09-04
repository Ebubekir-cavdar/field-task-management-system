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
 * Her HTTP isteğinde Zustand AuthStore'daki aktif kullanıcının UserID'sini X-User-ID başlığı olarak otomatik ekler.
 */
api.interceptors.request.use((config) => {
  try {
    // Zustand Auth Store'dan mevcut kullanıcıyı al
    const { useAuthStore } = require('../store/useAuthStore');
    const user = useAuthStore.getState().user;
    if (user && user.userID) {
      config.headers['X-User-ID'] = user.userID.toString();
    }
  } catch (e) {
    // Döngüsel bağımlılık durumunda sessizce geç
  }
  return config;
});

/**
 * Response Interceptor (Yanıt Sonrası Arayazılım):
 * Sunucudan gelen yanıtları ve dönen HTTP hatalarını (400, 500 vb.) yakalar.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.title ||
      'Sunucu ile iletişim kurulurken bir hata oluştu.';
    return Promise.reject(new Error(message));
  }
);

export default api;


