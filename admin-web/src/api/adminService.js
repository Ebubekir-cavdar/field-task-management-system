import axiosClient from './axiosClient';

export const adminService = {
  // Giriş Yapma
  login: async (email, password, rememberMe = true) => {
    const res = await axiosClient.post('/auth/login', {
      email,
      password,
      rememberMe,
    });
    return res.data; // { token, refreshToken, user }
  },

  // Çıkış Yapma
  logout: async (refreshToken) => {
    try {
      if (refreshToken) {
        await axiosClient.post('/auth/revoke', { refreshToken });
      }
    } catch (e) {
      // Sessizce geç
    }
  },

  // İstatistikleri (KPI) Çekme
  getStats: async () => {
    const res = await axiosClient.get('/admin/stats');
    return res.data;
  },

  // Tüm Görevleri Listeleme (Opsiyonel status ve userId filtresi ile)
  getAllTasks: async (status = 'ALL', userId = null) => {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    if (userId && userId > 0) params.userId = userId;
    const res = await axiosClient.get('/admin/tasks', { params });
    return res.data;
  },

  // Yeni Görev Oluşturma ve Personele Atama
  createTask: async ({ title, description, userId }) => {
    const res = await axiosClient.post('/tasks', {
      title,
      description,
      userId: Number(userId),
    });
    return res.data;
  },

  // Görevi Silme
  deleteTask: async (taskId) => {
    const res = await axiosClient.delete(`/admin/tasks/${taskId}`);
    return res.data;
  },

  // Görevin Hareket Loglarını Getirme
  getTaskLogs: async (taskId) => {
    const res = await axiosClient.get(`/tasks/${taskId}/logs`);
    return res.data;
  },

  // Tüm Personelleri ve Görev Sayılarını Getirme
  getAllUsers: async () => {
    const res = await axiosClient.get('/admin/users');
    return res.data;
  },

  // Personel Rolünü Değiştirme (Admin <-> Worker)
  updateUserRole: async (userId, role) => {
    const res = await axiosClient.patch(`/admin/users/${userId}/role`, { role });
    return res.data;
  },
};
