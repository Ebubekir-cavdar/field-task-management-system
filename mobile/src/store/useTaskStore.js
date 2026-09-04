import { create } from 'zustand';
import api from '../services/api';

/**
 * Zustand Task Store (Görev Yönetimi Durum Yönetimi):
 * Kullanıcının görev listesi, seçili görev detayı, görev hareket logları ve görev ekleme/başlatma/tamamlama istekleri burada yönetilir.
 */
export const useTaskStore = create((set, get) => ({
  // State (Durum Değişkenleri)
  myTasks: [],          // Giriş yapan kullanıcının görev listesi
  selectedTask: null,   // Detayı incelenen aktif görev nesnesi
  taskLogs: [],         // İncelemekte olan görevin geçmiş hareket logları
  isLoading: false,     // API isteği devam ediyor mu?
  error: null,          // Hata mesajı

  /**
   * Oturum açan kullanıcının kendi görev listesini sunucudan çeker.
   * GET /api/v1/tasks/my-tasks
   */
  fetchMyTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/tasks/my-tasks');
      set({ myTasks: response.data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * Tek bir görevin detaylı bilgilerini ID'ye göre getirir.
   * GET /api/v1/tasks/{taskId}
   */
  fetchTaskById: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/tasks/${taskId}`);
      set({ selectedTask: response.data, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Görevi başlatma (Durumunu IN_PROGRESS yapma) isteği.
   * PATCH /api/v1/tasks/{taskId}/start
   */
  startTask: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/tasks/${taskId}/start`);
      // Tek istek ile güncel detayı ve genel listeyi çek
      await get().fetchTaskById(taskId);
      await get().fetchMyTasks();
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Görevi fotoğraflı olarak tamamlama (Durumunu COMPLETED yapma) isteği.
   * POST /api/v1/tasks/{taskId}/complete (multipart/form-data)
   * @param {number} taskId Tamamlanacak görev ID'si
   * @param {string} photoUri Kameradan çekilen fotoğrafın yerel URI adresi
   * @param {object} location Cihazdan çekilen GPS konum nesnesi ({ latitude, longitude })
   */
  completeTask: async (taskId, photoUri, location = null) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();

      // Fotoğraf var ise React Native FormData yapısına uygun nesne oluşturulup eklenir
      if (photoUri) {
        const filename = photoUri.split('/').pop() || `proof_${taskId}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('photo', {
          uri: photoUri,
          name: filename,
          type: type,
        });
      }

      // GPS Konum koordinatları var ise form verilerine ekle
      if (location && location.latitude != null && location.longitude != null) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
        formData.append('Latitude', location.latitude.toString());
        formData.append('Longitude', location.longitude.toString());
      }

      // Sunucuya multipart/form-data isteği atılır
      const response = await api.post(`/tasks/${taskId}/complete`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Tek istek ile güncel görevi ve genel listeyi çek
      await get().fetchTaskById(taskId);
      await get().fetchMyTasks();
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },


  /**
   * Göreve ait tüm geçmiş hareket loglarını çeker.
   * GET /api/v1/tasks/{taskId}/logs
   */
  fetchTaskLogs: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/tasks/${taskId}/logs`);
      set({ taskLogs: response.data, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Yeni bir görev oluşturup belirtilen personele atar.
   * POST /api/v1/tasks
   */
  createTask: async (title, description, userId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/tasks', {
        title,
        description,
        userID: parseInt(userId, 10),
      });
      // Görev eklendikten sonra listeyi yenile
      await get().fetchMyTasks();
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));

