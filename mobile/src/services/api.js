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


