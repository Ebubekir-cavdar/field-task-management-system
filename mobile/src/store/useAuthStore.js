import { create } from 'zustand';
import api from '../services/api';

/**
 * Zustand Auth Store (Kimlik Doğrulama Durum Yönetimi):
 * Kullanıcı oturum bilgileri (user), yüklenme durumları ve auth istekleri (login, register, logout) bu global store üzerinden yönetilir.
 */
export const useAuthStore = create((set) => ({
  // State (Durum Değişkenleri)
  user: null,       // Giriş yapmış kullanıcının profil bilgileri nesnesi
  isLoading: false, // İşlem devam ediyor mu?
  error: null,      // Oluşan hata mesajı

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
   * Kullanıcı Girişi (Login API İsteği)
   * Başarılı girişte kullanıcı bilgilerini saklar ve Axios başlığına X-User-ID ekler.
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { user } = response.data;

      // Axios HTTP İstemcisine X-User-ID başlığını ekle (Tüm isteklerde otomatik gider)
      if (user && user.userID) {
        api.defaults.headers.common['X-User-ID'] = user.userID.toString();
      }

      // Global store durumunu güncelle
      set({
        user,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Oturumu Kapatma (Logout)
   */
  logout: () => {
    delete api.defaults.headers.common['X-User-ID'];
    set({ user: null, error: null });
  },
}));


