import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTaskStore } from '../store/useTaskStore';
import { API_BASE_URL } from '../config';

/**
 * Görev Detayı ve Aksiyon Ekranı Bileşeni.
 * Personelin görevi başlatmasını (IN_PROGRESS), kamera ile fotoğraf çekip görevi tamamlamasını (COMPLETED)
 * ve görev tarihçesini görüntülemesini sağlar.
 */
export default function TaskDetailScreen({ route, navigation }) {
  // Navigasyon parametrelerinden taskId alınır
  const { taskId } = route.params;

  // Task Store'dan gerekli fonksiyon ve durumlar çekilir
  const { selectedTask, fetchTaskById, startTask, completeTask, isLoading } = useTaskStore();

  // Kamerayla çekilen fotoğrafın cihaz içi yerel URI adresi
  const [photoUri, setPhotoUri] = useState(null);

  // Sayfa açıldığında veya taskId değiştiğinde görevin en güncel detaylarını sunucudan çek
  useEffect(() => {
    fetchTaskById(taskId);
  }, [taskId]);

  /**
   * "Görevi Başlat" Butonuna basıldığında tetiklenir.
   */
  const handleStartTask = async () => {
    try {
      await startTask(taskId);
      Alert.alert('Başarılı', 'Görev başlatıldı (IN_PROGRESS).');
    } catch (err) {
      Alert.alert('Hata', err.message || 'Görev başlatılamadı.');
    }
  };

  /**
   * Expo ImagePicker ile Cihaz Kamerasını Açma ve Fotoğraf Çekme Metodu.
   */
  const handlePickImage = async () => {
    // 1. Kullanıcıdan kamera erişim izni iste
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kanıt fotoğrafı çekebilmek için kamera izni vermelisiniz.');
      return;
    }

    // 2. Kamerayı başlat
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Çekilen fotoğrafı kırpma/düzenleme seçeneği
      quality: 0.7,        // Fotoğraf kalitesi / dosya boyut dengesi (%70)
    });

    // 3. Fotoğraf çekildiyse yerel URI'yi state'e kaydet
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  /**
   * "Görevi Tamamla" Butonuna basıldığında tetiklenir.
   * Fotoğraf çekilip çekilmediğini kontrol eder ve sunucuya yükler.
   */
  const handleCompleteTask = async () => {
    if (!photoUri) {
      Alert.alert('Kanıt Fotoğrafı Eksik', 'Görevi tamamlamak için lütfen kamerasını açıp kanıt fotoğrafı çekiniz.');
      return;
    }

    try {
      await completeTask(taskId, photoUri);
      Alert.alert('Tebrikler!', 'Kanıt fotoğrafı yüklendi ve görev başarıyla tamamlandı (COMPLETED).');
      setPhotoUri(null); // Çekilen geçici fotoğraf durumunu sıfırla
    } catch (err) {
      Alert.alert('Hata', err.message || 'Görev tamamlanırken hata oluştu.');
    }
  };

  // Görev verisi henüz yüklenmediyse yüklenme göstergesi bas
  if (!selectedTask) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Rozet (Badge) Renk ve Etiket Seçimi
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return { label: 'ATANDI', color: '#3B82F6', bg: '#1E3A8A' };
      case 'IN_PROGRESS':
        return { label: 'DEVAM EDİYOR', color: '#F59E0B', bg: '#78350F' };
      case 'COMPLETED':
        return { label: 'TAMAMLANDI', color: '#10B981', bg: '#064E3B' };
      default:
        return { label: status, color: '#94A3B8', bg: '#334155' };
    }
  };

  const badge = getStatusBadge(selectedTask.status);

  // Görev tamamlanmış ve sunucuda kanıt fotoğrafı varsa tam URL adresini oluştur
  const serverProofUrl = selectedTask.proof_Image_Url || selectedTask.proof_image_url || selectedTask.proofImage_Url;
  const fullProofUrl = serverProofUrl
    ? `${API_BASE_URL}${serverProofUrl}`
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Görev Başlığı ve Rozet Bilgisi */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Text style={styles.taskTitle}>{selectedTask.title}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>

          <Text style={styles.assignedUserText}>
            Atanan Personel: {selectedTask.userName} {selectedTask.userSurname}
          </Text>
        </View>

        {/* Görev Açıklaması */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Görev Tanımı & Detaylar</Text>
          <Text style={styles.descriptionText}>
            {selectedTask.description || 'Detaylı açıklama girilmemiş.'}
          </Text>
        </View>

        {/* Zaman Damgaları (Oluşturulma, Başlatılma, Tamamlanma) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Zaman Bilgileri</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Oluşturulma:</Text>
            <Text style={styles.infoValue}>
              {new Date(selectedTask.created_at).toLocaleString('tr-TR')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Başlatılma:</Text>
            <Text style={styles.infoValue}>
              {selectedTask.started_at
                ? new Date(selectedTask.started_at).toLocaleString('tr-TR')
                : 'Henüz Başlatılmadı'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tamamlanma:</Text>
            <Text style={styles.infoValue}>
              {selectedTask.completed_at
                ? new Date(selectedTask.completed_at).toLocaleString('tr-TR')
                : 'Henüz Tamamlanmadı'}
            </Text>
          </View>
        </View>

        {/* Sunucuda Yüklü Kanıt Fotoğrafı Varsa Göster */}
        {fullProofUrl && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sunucudaki Kanıt Fotoğrafı</Text>
            <Image source={{ uri: fullProofUrl }} style={styles.proofImage} resizeMode="cover" />
            <Text style={styles.imagePathText}>{serverProofUrl}</Text>
          </View>
        )}

        {/* Görev Durumu: ASSIGNED (Atandı) ise Görevi Başlat Butonu Göster */}
        {selectedTask.status === 'ASSIGNED' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartTask}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.actionButtonText}>▶ Görevi Başlat (IN_PROGRESS)</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Görev Durumu: IN_PROGRESS (Devam Ediyor) ise Kamera Açma ve Fotoğraflı Tamamlama Alanını Göster */}
        {selectedTask.status === 'IN_PROGRESS' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Görev Tamamlama & Fotoğraf Yükleme</Text>

            {/* Kamera Butonu */}
            <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage}>
              <Text style={styles.cameraButtonText}>📷 Kamera ile Fotoğraf Çek</Text>
            </TouchableOpacity>

            {/* Çekilen Fotoğraf Önizlemesi */}
            {photoUri && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Çekilen Kanıt Fotoğrafı Önizleme:</Text>
                <Image source={{ uri: photoUri }} style={styles.previewImage} />
              </View>
            )}

            {/* Tamamla Butonu */}
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteTask}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionButtonText}>✓ Görevi Tamamla (COMPLETED)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Görev Hareket Geçmişi Ekranına Geçiş Butonu */}
        <TouchableOpacity
          style={styles.logsButton}
          onPress={() => navigation.navigate('TaskLogs', { taskId: selectedTask.taskID })}
        >
          <Text style={styles.logsButtonText}>📋 Görev Log Geçmişini Gör</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Stil Nesnesi
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  assignedUserText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  proofImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 8,
  },
  imagePathText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  startButton: {
    backgroundColor: '#D97706',
  },
  completeButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraButton: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cameraButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 6,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  logsButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginTop: 8,
    marginBottom: 24,
  },
  logsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
  },
});

