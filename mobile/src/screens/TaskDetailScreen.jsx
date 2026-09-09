import React, { useEffect, useState, useRef } from 'react';
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
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import audioService from '../services/audioService';
import { useTaskStore } from '../store/useTaskStore';
import { useThemeStore } from '../store/useThemeStore';
import { lightTheme, darkTheme } from '../theme';
import { API_BASE_URL } from '../config';

/**
 * Görev Detayı ve Aksiyon Ekranı Bileşeni.
 * Personelin görevi başlatmasını (IN_PROGRESS), kamera ile fotoğraf çekip görevi tamamlamasını (COMPLETED),
 * ses kaydı eklemesini ve görev tarihçesini görüntülemesini sağlar.
 */
export default function TaskDetailScreen({ route, navigation }) {
  // Navigasyon parametrelerinden taskId alınır
  const { taskId } = route.params;

  // Task Store ve Theme Store'dan gerekli fonksiyon ve durumlar çekilir
  const { selectedTask, fetchTaskById, startTask, completeTask, isLoading } = useTaskStore();
  const { isDarkMode } = useThemeStore();
  const colors = isDarkMode ? darkTheme : lightTheme;

  // Kamerayla çekilen fotoğrafın cihaz içi yerel URI adresi
  const [photoUri, setPhotoUri] = useState(null);

  // Cihaz GPS Konum Durumları (Latitude, Longitude)
  const [location, setLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // --- Ses Kaydı ve Oynatma Durumları (audioService) ---
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState(null);
  const [previewPlayer, setPreviewPlayer] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Sunucudaki tamamlanmış ses kaydını dinleme durumları
  const [serverPlayer, setServerPlayer] = useState(null);
  const [isPlayingServerAudio, setIsPlayingServerAudio] = useState(false);

  const recordingTimerRef = useRef(null);

  // Sayfa açıldığında veya taskId değiştiğinde görevin en güncel detaylarını sunucudan çek
  useEffect(() => {
    fetchTaskById(taskId);
  }, [taskId]);

  // Sayfadan çıkıldığında ses ve sayaç kaynaklarını güvenle serbest bırak
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (previewPlayer) {
        previewPlayer.release();
      }
      if (serverPlayer) {
        serverPlayer.release();
      }
    };
  }, [previewPlayer, serverPlayer]);

  /**
   * Cihaz GPS İznini İster ve Anlık Konumu Alır
   */
  const fetchCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum İzni Gerekli', 'Görev tamamlama esnasında konumunuzun kaydedilmesi için konum izni vermelisiniz.');
        setIsFetchingLocation(false);
        return null;
      }
      
      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (posErr) {
        console.warn('getCurrentPositionAsync failed, falling back to getLastKnownPositionAsync:', posErr);
        loc = await Location.getLastKnownPositionAsync();
      }

      if (!loc || !loc.coords) {
        Alert.alert('Konum Alınamadı', 'Cihazınızdan GPS konum verisi alınamadı. Lütfen cihaz konum servislerinizin açık olduğunu kontrol edin.');
        setIsFetchingLocation(false);
        return null;
      }

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(coords);
      setIsFetchingLocation(false);
      return coords;
    } catch (err) {
      console.warn('Location fetch error:', err);
      setIsFetchingLocation(false);
      return null;
    }
  };

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
   * Süreyi mm:ss formatına dönüştürür.
   */
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  /**
   * Ses Kaydını Başlatır (audioService)
   */
  const handleStartRecording = async () => {
    if (!audioService.isAudioSupported()) {
      Alert.alert(
        'Desteklenmiyor',
        'Cihazınızda veya mevcut Expo Go sürümünde ses kayıt modülü desteklenmiyor. Fotoğraf ve konum ile görevi tamamlayabilirsiniz.'
      );
      return;
    }

    try {
      // Mikrofon izni iste
      const hasPermission = await audioService.requestAudioPermissions();
      if (!hasPermission) {
        Alert.alert('Mikrofon İzni Gerekli', 'Sesli açıklama kaydedebilmek için mikrofon izni vermelisiniz.');
        return;
      }

      // Varsa önceki sesleri temizle
      if (previewPlayer) {
        previewPlayer.release();
        setPreviewPlayer(null);
      }
      setIsPlayingPreview(false);

      const newRecording = await audioService.startRecording();

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Sayaç başlat
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Ses kaydı başlatılamadı:', err);
      Alert.alert('Kayıt Hatası', 'Ses kaydı başlatılamadı: ' + (err.message || 'Bilinmeyen hata'));
    }
  };

  /**
   * Ses Kaydını Durdurur ve Yerel Dosya Yolunu Alır
   */
  const handleStopRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!recording) return;

    try {
      const uri = await audioService.stopRecording(recording);
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.warn('Ses kaydı durdurulamadı:', err);
      setIsRecording(false);
    }
  };

  /**
   * Çekilen Geçici Ses Kaydını Önizleme Olarak Oynatır / Duraklatır
   */
  const handleTogglePreviewAudio = async () => {
    if (!audioUri) return;

    try {
      if (previewPlayer) {
        if (isPlayingPreview) {
          previewPlayer.pause();
          setIsPlayingPreview(false);
        } else {
          previewPlayer.play();
          setIsPlayingPreview(true);
        }
      } else {
        const player = audioService.createPlayer(audioUri, () => {
          setIsPlayingPreview(false);
        });
        if (player) {
          setPreviewPlayer(player);
          player.play();
          setIsPlayingPreview(true);
        } else {
          Alert.alert('Bilgi', 'Ses oynatıcı bu ortamda desteklenmiyor.');
        }
      }
    } catch (err) {
      console.warn('Önizleme sesi çalınamadı:', err);
    }
  };

  /**
   * Kaydedilen Geçici Ses Kaydını Siler
   */
  const handleDeleteAudio = async () => {
    if (previewPlayer) {
      try {
        previewPlayer.release();
      } catch (e) {}
      setPreviewPlayer(null);
    }
    setIsPlayingPreview(false);
    setAudioUri(null);
    setRecordingDuration(0);
  };

  /**
   * Sunucudaki Tamamlanmış Göreve Ait Ses Kaydını Oynatır / Duraklatır
   */
  const handleToggleServerAudio = async (url) => {
    if (!url) return;

    try {
      if (serverPlayer) {
        if (isPlayingServerAudio) {
          serverPlayer.pause();
          setIsPlayingServerAudio(false);
        } else {
          serverPlayer.play();
          setIsPlayingServerAudio(true);
        }
      } else {
        const player = audioService.createPlayer(url, () => {
          setIsPlayingServerAudio(false);
        });
        if (player) {
          setServerPlayer(player);
          player.play();
          setIsPlayingServerAudio(true);
        } else {
          Alert.alert('Bilgi', 'Ses oynatıcı bu ortamda desteklenmiyor.');
        }
      }
    } catch (err) {
      console.warn('Sunucu sesi oynatılamadı:', err);
      Alert.alert('Ses Oynatma Hatası', 'Ses kaydı oynatılamadı.');
    }
  };

  /**
   * "Görevi Tamamla" Butonuna basıldığında tetiklenir.
   * Fotoğraf, GPS konumu ve isteğe bağlı ses kaydını sunucuya yükler.
   */
  const handleCompleteTask = async () => {
    if (!photoUri) {
      Alert.alert('Kanıt Fotoğrafı Eksik', 'Görevi tamamlamak için lütfen kameranızı açıp kanıt fotoğrafı çekiniz.');
      return;
    }

    // Kayıt hala devam ediyorsa önce durdur
    if (isRecording) {
      await handleStopRecording();
    }

    let currentLocation = location;
    if (!currentLocation) {
      currentLocation = await fetchCurrentLocation();
    }

    try {
      await completeTask(taskId, photoUri, currentLocation, audioUri);
      Alert.alert('Tebrikler!', 'Kanıt fotoğrafı, konum ve varsa sesli notunuz yüklendi. Görev başarıyla tamamlandı (COMPLETED).');
      setPhotoUri(null); // Çekilen geçici fotoğraf durumunu sıfırla
      setLocation(null); // Geçici konum durumunu sıfırla
      handleDeleteAudio(); // Geçici ses durumunu sıfırla
    } catch (err) {
      Alert.alert('Hata', err.message || 'Görev tamamlanırken hata oluştu.');
    }
  };

  // Görev verisi henüz yüklenmediyse yüklenme göstergesi bas
  if (!selectedTask) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Rozet (Badge) Renk ve Etiket Seçimi
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return { label: 'ATANDI', color: '#3B82F6', bg: isDarkMode ? '#1E3A8A' : '#DBEAFE' };
      case 'IN_PROGRESS':
        return { label: 'DEVAM EDİYOR', color: '#F59E0B', bg: isDarkMode ? '#78350F' : '#FEF3C7' };
      case 'COMPLETED':
        return { label: 'TAMAMLANDI', color: '#10B981', bg: isDarkMode ? '#064E3B' : '#D1FAE5' };
      default:
        return { label: status, color: '#94A3B8', bg: isDarkMode ? '#334155' : '#E2E8F0' };
    }
  };

  const badge = getStatusBadge(selectedTask.status);

  // Görev tamamlanmış ve sunucuda kanıt fotoğrafı varsa tam URL adresini oluştur
  const serverProofUrl = selectedTask.proof_Image_Url || selectedTask.proof_image_url || selectedTask.proofImage_Url;
  const fullProofUrl = serverProofUrl
    ? `${API_BASE_URL}${serverProofUrl}`
    : null;

  // Görev tamamlanmış ve sunucuda sesli açıklama varsa tam URL adresini oluştur
  const serverAudioUrl = selectedTask.audio_Url || selectedTask.audio_url || selectedTask.Audio_Url;
  const fullAudioUrl = serverAudioUrl
    ? `${API_BASE_URL}${serverAudioUrl}`
    : null;

  // GPS Konum Bilgisi (Farklı büyüklük/küçüklük durumlarına karşı güvenli erişim)
  const taskLatitude = selectedTask.latitude ?? selectedTask.Latitude;
  const taskLongitude = selectedTask.longitude ?? selectedTask.Longitude;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Görev Başlığı ve Rozet Bilgisi */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.taskTitle, { color: colors.text }]}>{selectedTask.title}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>

          <Text style={[styles.assignedUserText, { color: colors.subtext }]}>
            Atanan Personel: {selectedTask.userName} {selectedTask.userSurname}
          </Text>
        </View>

        {/* Görev Açıklaması */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.sectionTitle}>Görev Tanımı & Detaylar</Text>
          <Text style={[styles.descriptionText, { color: colors.text }]}>
            {selectedTask.description || 'Detaylı açıklama girilmemiş.'}
          </Text>
        </View>

        {/* Zaman Damgaları (Oluşturulma, Başlatılma, Tamamlanma) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.sectionTitle}>Zaman Bilgileri</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>Oluşturulma:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date(selectedTask.created_at).toLocaleString('tr-TR')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>Başlatılma:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {selectedTask.started_at
                ? new Date(selectedTask.started_at).toLocaleString('tr-TR')
                : 'Henüz Başlatılmadı'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>Tamamlanma:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {selectedTask.completed_at
                ? new Date(selectedTask.completed_at).toLocaleString('tr-TR')
                : 'Henüz Tamamlanmadı'}
            </Text>
          </View>
        </View>

        {/* Sunucuda Yüklü Kanıt Fotoğrafı Varsa Göster */}
        {fullProofUrl && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>Sunucudaki Kanıt Fotoğrafı</Text>
            <Image source={{ uri: fullProofUrl }} style={styles.proofImage} resizeMode="cover" />
            <Text style={styles.imagePathText}>{serverProofUrl}</Text>
          </View>
        )}

        {/* Sunucudaki GPS Konum Bilgisi (Varsa Göster) */}
        {(taskLatitude != null && taskLongitude != null) ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>📍 Tamamlanma Konumu (GPS)</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Enlem (Latitude):</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{taskLatitude}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>Boylam (Longitude):</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{taskLongitude}</Text>
            </View>

            <TouchableOpacity
              style={[styles.mapButton, { backgroundColor: colors.buttonBg, borderColor: colors.border }]}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${taskLatitude},${taskLongitude}`;
                Linking.openURL(url);
              }}
            >
              <Text style={[styles.mapButtonText, { color: colors.primary }]}>🗺️ Haritada Göster (Google Maps)</Text>
            </TouchableOpacity>
          </View>
        ) : selectedTask.status === 'COMPLETED' ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>📍 Tamamlanma Konumu (GPS)</Text>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>
              Bu görev tamamlanırken GPS konum bilgisi eklenmemiş veya izin verilmemiş.
            </Text>
          </View>
        ) : null}

        {/* Sunucudaki Sesli Açıklama (Ses Notu) - Varsa Göster */}
        {serverAudioUrl ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>🎙️ Saha Sesli Açıklaması (Ses Notu)</Text>
            <View style={[styles.audioCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9', borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.audioPlayCircle, { backgroundColor: colors.primary }]}
                onPress={() => handleToggleServerAudio(fullAudioUrl)}
              >
                <Text style={styles.audioPlayIconText}>{isPlayingServerAudio ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.audioCardTitle, { color: colors.text }]}>
                  {isPlayingServerAudio ? 'Ses Kaydı Çalınıyor...' : 'Sesli Notu Dinle'}
                </Text>
                <Text style={[styles.audioCardSub, { color: colors.subtext }]}>
                  Saha personelinin görevi tamamlarken eklediği ses açıklaması
                </Text>
              </View>
            </View>
            <Text style={styles.imagePathText}>{serverAudioUrl}</Text>
          </View>
        ) : null}

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
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>Görev Tamamlama & Kanıt Yükleme</Text>

            {/* Kamera Butonu */}
            <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.buttonBg, borderColor: colors.border }]} onPress={handlePickImage}>
              <Text style={[styles.cameraButtonText, { color: colors.text }]}>📷 Kamera ile Fotoğraf Çek</Text>
            </TouchableOpacity>

            {/* GPS Konumu Alma Butonu */}
            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: colors.buttonBg, borderColor: colors.border }]}
              onPress={fetchCurrentLocation}
              disabled={isFetchingLocation}
            >
              {isFetchingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.locationButtonText, { color: colors.text }]}>
                  {location
                    ? `📍 GPS Konumu Alındı (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
                    : '📍 Anlık GPS Konumunu Al'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Çekilen Fotoğraf Önizlemesi */}
            {photoUri && (
              <View style={styles.previewContainer}>
                <Text style={[styles.previewLabel, { color: colors.subtext }]}>Çekilen Kanıt Fotoğrafı Önizleme:</Text>
                <Image source={{ uri: photoUri }} style={styles.previewImage} />
              </View>
            )}

            {/* Sesli Açıklama / Ses Kaydı Alanı (Opsiyonel) */}
            <View style={[styles.audioSectionBox, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[styles.audioSectionHeader, { color: colors.text }]}>
                🎙️ Sesli Açıklama (İsteğe Bağlı)
              </Text>
              <Text style={[styles.audioSectionSub, { color: colors.subtext }]}>
                Görevi tamamlarken durumu sözlü açıklamak için ses kaydı alabilirsiniz.
              </Text>

              {/* Durum 1: Kayıt devam ediyorsa */}
              {isRecording ? (
                <View style={styles.recordingActiveBox}>
                  <View style={styles.recordingPulse}>
                    <View style={styles.redDot} />
                    <Text style={styles.recordingTimerText}>Kayıt Yapılıyor... {formatDuration(recordingDuration)}</Text>
                  </View>
                  <TouchableOpacity style={styles.stopRecordButton} onPress={handleStopRecording}>
                    <Text style={styles.stopRecordText}>⏹ Kaydı Bitir</Text>
                  </TouchableOpacity>
                </View>
              ) : audioUri ? (
                /* Durum 2: Ses kaydedildiyse dinleme ve silme */
                <View style={styles.audioRecordedBox}>
                  <TouchableOpacity
                    style={[styles.audioPreviewPlayBtn, { backgroundColor: colors.primary }]}
                    onPress={handleTogglePreviewAudio}
                  >
                    <Text style={styles.audioPreviewPlayIcon}>{isPlayingPreview ? '⏸' : '▶'}</Text>
                    <Text style={styles.audioPreviewPlayText}>
                      {isPlayingPreview ? 'Duraklat' : `Dinle (${formatDuration(recordingDuration)})`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteAudioButton} onPress={handleDeleteAudio}>
                    <Text style={styles.deleteAudioText}>🗑️ Sil</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Durum 3: Henüz ses kaydedilmediyse */
                <TouchableOpacity
                  style={[styles.startRecordButton, { backgroundColor: colors.buttonBg, borderColor: colors.border }]}
                  onPress={handleStartRecording}
                >
                  <Text style={[styles.startRecordButtonText, { color: colors.text }]}>
                    🎙️ Ses Kaydı Başlat (Konuşarak Açıkla)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

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
          style={[styles.logsButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => navigation.navigate('TaskLogs', { taskId: selectedTask.taskID })}
        >
          <Text style={[styles.logsButtonText, { color: colors.primary }]}>📋 Görev Log Geçmişini Gör</Text>
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
  mapButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  mapButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  locationButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
  // --- Ses Kaydı & Oynatıcı Stilleri ---
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  audioPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  audioCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  audioCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  audioSectionBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  audioSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  audioSectionSub: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  recordingActiveBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 10,
    borderRadius: 10,
  },
  recordingPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  stopRecordButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopRecordText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  audioRecordedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  audioPreviewPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  audioPreviewPlayIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  audioPreviewPlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteAudioButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444460',
  },
  deleteAudioText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  startRecordButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  startRecordButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

