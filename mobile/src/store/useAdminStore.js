import { create } from 'zustand';
import api from '../services/api';

/**
 * Zustand Admin Store (Yönetici Paneli Durum Yönetimi):
 * Sistem istatistikleri, personel listesi, kullanıcı rol güncellemeleri,
 * tüm saha görevlerinin listelenmesi ve görev silme işlemleri burada yönetilir.
 */
export const useAdminStore = create((set, get) => ({
  stats: null,
  users: [],
  allTasks: [],
  isLoading: false,
  error: null,

  /**
   * Sistem genelindeki istatistikleri çeker.
   * GET /api/v1/admin/stats
   */
  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/stats');
      set({ stats: response.data, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Tüm personelleri ve görev istatistiklerini çeker.
   * GET /api/v1/admin/users
   */
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/admin/users');
      set({ users: response.data, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Sistemdeki tüm görevleri filtreli olarak çeker.
   * GET /api/v1/admin/tasks
   */
  fetchAllTasks: async (status = 'ALL', userId = null) => {
    set({ isLoading: true, error: null });
    try {
      const params = {};
      if (status && status !== 'ALL') params.status = status;
      if (userId) params.userId = userId;

      const response = await api.get('/admin/tasks', { params });
      set({ allTasks: response.data, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Belirtilen kullanıcının rolünü günceller (Admin <-> Worker).
   * PATCH /api/v1/admin/users/{userId}/role
   */
  updateUserRole: async (userId, newRole) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/admin/users/${userId}/role`, {
        role: newRole,
      });
      // Başarılı güncelleme sonrası kullanıcıları ve istatistikleri tazele
      await get().fetchUsers();
      await get().fetchStats();
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Bir görevi ve verilerini sistemden siler.
   * DELETE /api/v1/admin/tasks/{taskId}
   */
  deleteTask: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.delete(`/admin/tasks/${taskId}`);
      // Silme sonrası görevleri ve istatistikleri tazele
      set((state) => ({
        allTasks: state.allTasks.filter((t) => t.taskID !== taskId),
        isLoading: false,
      }));
      await get().fetchStats();
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
