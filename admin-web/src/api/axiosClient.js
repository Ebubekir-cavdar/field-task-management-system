import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:5000`;
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = getBaseUrl();
const API_URL = `${API_BASE_URL}/api/v1`;

export const getStoredTokens = () => {
  const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
  const refreshToken = localStorage.getItem('admin_refresh_token') || sessionStorage.getItem('admin_refresh_token');
  const user = JSON.parse(localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user') || 'null');
  return { token, refreshToken, user };
};

export const setStoredTokens = ({ token, refreshToken, user, rememberMe = true }) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  if (token) storage.setItem('admin_token', token);
  if (refreshToken) storage.setItem('admin_refresh_token', refreshToken);
  if (user) storage.setItem('admin_user', JSON.stringify(user));
};

export const clearStoredTokens = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh_token');
  localStorage.removeItem('admin_user');
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_refresh_token');
  sessionStorage.removeItem('admin_user');
};

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Attach JWT Token & X-User-ID
axiosClient.interceptors.request.use((config) => {
  const { token, user } = getStoredTokens();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (user?.userID) {
    config.headers['X-User-ID'] = user.userID.toString();
  }
  return config;
});

// Response Interceptor: Handle Silent Refresh (401) & Rate Limiting (429)
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

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/revoke')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken } = getStoredTokens();
      if (!refreshToken) {
        clearStoredTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { token: newAccessToken, refreshToken: newRefreshToken, user } = res.data;

        // Remember which storage was used
        const rememberMe = !!localStorage.getItem('admin_token');
        setStoredTokens({
          token: newAccessToken,
          refreshToken: newRefreshToken,
          user,
          rememberMe,
        });

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearStoredTokens();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // 429 Too Many Requests
    if (error.response?.status === 429) {
      const retryAfterSeconds = error.response?.data?.retryAfterSeconds || 60;
      const customErr = new Error(
        error.response?.data?.message || `Çok fazla istek yapıldı. Lütfen ${retryAfterSeconds} saniye sonra tekrar deneyin.`
      );
      customErr.isRateLimited = true;
      customErr.retryAfterSeconds = retryAfterSeconds;
      return Promise.reject(customErr);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
