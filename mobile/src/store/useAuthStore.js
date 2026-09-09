import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const TOKEN_STORAGE_KEY = 'auth_jwt_token';
const REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token';
const USER_STORAGE_KEY = 'auth_user_data';

/**
 * Zustand Auth Store (Kimlik Doğrulama Durum Yönetimi):
 * Kullanıcı oturum bilgileri (user), JWT Access Token (token), Refresh Token (refreshToken),
 * yüklenme durumları ve auth istekleri bu global store üzerinden yönetilir.
 * Oturum expo-secure-store ile cihazda güvenli şekilde saklanır.
 */
export const useAuthStore = create((set, get) => ({
  // State (Durum Değişkenleri)
  user: null,              // Giriş yapmış kullanıcının profil bilgileri nesnesi (role dahil)
  token: null,             // Kısa ömürlü JWT Access Token (15 dk)
  refreshToken: null,      // Uzun ömürlü Refresh Token
  isCheckingAuth: true,    // Uygulama açılışında SecureStore kontrolü tamamlanana kadar aktif
  isLoading: false,        // Giriş/Kayıt buton işlemlerinde aktif
  lockoutSeconds: 0,       // Rate Limiting ceza süresi (saniye)
  error: null,             // Oluşan hata mesajı

  // Giriş yapan kullanıcının Admin olup olmadığını denetleyen yardımcı metod
  isAdmin: () => get().user?.role === 'Admin',

  // Ceza süresini güncelleyen metod
  setLockoutSeconds: (sec) => set({ lockoutSeconds: Math.max(0, sec) }),

  /**
   * Uygulama Açılışında Oturum Kontrolü (Check Auth):
   * SecureStore'dan kayıtlı token, refresh token ve kullanıcı verilerini okur, Axios başlıklarını hazırlar.
   */
  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
      const storedUserJson = await SecureStore.getItemAsync(USER_STORAGE_KEY);

      if (storedToken && storedUserJson) {
        const storedUser = JSON.parse(storedUserJson);

        // Axios varsayılan başlıklarına ekle
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        if (storedUser?.userID) {
          api.defaults.headers.common['X-User-ID'] = storedUser.userID.toString();
        }

        set({
          token: storedToken,
          refreshToken: storedRefreshToken || null,
          user: storedUser,
          isCheckingAuth: false,
          error: null,
        });
      } else {
        set({ token: null, refreshToken: null, user: null, isCheckingAuth: false });
      }
    } catch (e) {
      console.warn('Oturum bilgisi yüklenirken hata:', e);
      set({ token: null, refreshToken: null, user: null, isCheckingAuth: false });
    }
  },

  /**
   * Yeni Kullanıcı Kaydı (Register API İsteği)
   */
  register: async (name, surname, email, password) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/register', {
        name,
        surname,
        email,
        password,
      });
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Kullanıcı Girişi (Login API İsteği):
   * Başarılı girişte JWT Access Token, Refresh Token ve kullanıcı bilgilerini SecureStore'a kaydeder,
   * Axios başlıklarına ekler ve global store'u günceller.
   */
  login: async (email, password, rememberMe = true) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe,
      });

      const { user, token, refreshToken } = response.data;

      // Axios varsayılan başlıklarına ekle
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      if (user && user.userID) {
        api.defaults.headers.common['X-User-ID'] = user.userID.toString();
      }

      // Beni Hatırla seçildiyse SecureStore'a kalıcı kaydet; seçilmediyse cihazda kalıcı veri bırakma
      if (rememberMe) {
        if (token) await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
        if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        if (user) await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        try {
          await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
          await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
        } catch (e) {}
      }

      // Global store durumunu güncelle (Oturum açık kaldığı sürece RAM'de tutulur)
      set({
        token: token || null,
        refreshToken: refreshToken || null,
        user,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err) {
      let seconds = 0;
      if (
        err?.isRateLimited ||
        err?.retryAfterSeconds ||
        err?.message?.includes('Çok fazla') ||
        err?.message?.includes('saniye')
      ) {
        const match = err.message?.match(/(\d+)\s*saniye/);
        seconds = err.retryAfterSeconds || (match ? parseInt(match[1], 10) : 60);
      }

      set({
        error: err.message,
        isLoading: false,
        lockoutSeconds: seconds > 0 ? seconds : get().lockoutSeconds,
      });
      throw err;
    }
  },

  /**
   * Token Yenileme (Silent Refresh):
   * 401 hatası alındığında veya Access Token süresi bittiğinde
   * Refresh Token kullanarak yeni bir Access Token ve yeni Refresh Token çifti alır (Rotation).
   */
  refreshAccessToken: async () => {
    // Önce Store'dan, yoksa SecureStore'dan refresh token'ı al
    let currentRefreshToken = get().refreshToken;
    if (!currentRefreshToken) {
      try {
        currentRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
      } catch (e) {}
    }

    if (!currentRefreshToken) {
      throw new Error('Yenileme belirteci (refresh token) bulunamadı.');
    }

    try {
      const response = await api.post('/auth/refresh', {
        refreshToken: currentRefreshToken,
      });

      const { token: newAccessToken, refreshToken: newRefreshToken, user } = response.data;

      // Axios varsayılan başlıklarını güncelle
      if (newAccessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      }

      // Eğer cihazda kayıtlı oturum varsa SecureStore'u da yeni token çiftiyle güncelle
      const hasStoredToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (hasStoredToken) {
        if (newAccessToken) await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, newAccessToken);
        if (newRefreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);
      }

      set({
        token: newAccessToken,
        refreshToken: newRefreshToken || currentRefreshToken,
        user: user || get().user,
      });

      return newAccessToken;
    } catch (err) {
      // Refresh token da geçersiz veya süresi dolmuşsa oturumu güvenle kapat
      await get().logout();
      throw err;
    }
  },

  /**
   * Oturumu Kapatma (Logout):
   * Sunucuda refresh token'ı iptal eder, SecureStore'daki kimlik bilgilerini temizler ve Axios başlıklarını siler.
   */
  logout: async () => {
    let currentRefreshToken = get().refreshToken;
    if (!currentRefreshToken) {
      try {
        currentRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
      } catch (e) {}
    }

    if (currentRefreshToken) {
      try {
        await api.post('/auth/revoke', { refreshToken: currentRefreshToken });
      } catch (e) {
        console.warn('Revoke token isteği hatası:', e);
      }
    }

    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    } catch (e) {
      console.warn('SecureStore oturum temizleme hatası:', e);
    }
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['X-User-ID'];
    set({ user: null, token: null, refreshToken: null, error: null });
  },
}));


