import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Yeni Görev Oluşturma Ekranı Bileşeni.
 * Saha personeline görev atamak için form alanları sunar ve `createTask` store metodunu çağırır.
 */
export default function CreateTaskScreen({ navigation }) {
  const { user } = useAuthStore();
  const { createTask, isLoading } = useTaskStore();

  // Form State'leri
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Varsayılan olarak görevi oluşturan kullanıcının kendi ID'sini atama alanına yazar
  const [targetUserId, setTargetUserId] = useState(user?.userID ? user.userID.toString() : '1');

  /**
   * Görevi Kaydet ve Ata butonuna basıldığında çalışan form onay metodu.
   */
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen görev başlığını giriniz.');
      return;
    }
    if (!targetUserId.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen görevin atanacağı Kullanıcı ID (UserID) giriniz.');
      return;
    }

    try {
      await createTask(title, description, targetUserId);
      Alert.alert('Başarılı', 'Yeni görev başarıyla oluşturuldu ve atandı.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Hata', err.message || 'Görev oluşturulurken hata oluştu.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Başlık ve Açıklama Metni */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Yeni Görev Oluştur</Text>
          <Text style={styles.headerSubtitle}>Saha personeline yeni bir iş görevi tanımlayın.</Text>
        </View>

        {/* Form Kartı */}
        <View style={styles.formCard}>
          {/* Görev Başlığı Girişi */}
          <Text style={styles.label}>Görev Başlığı *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Trafo Bakımı ve Fotoğraflama"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />

          {/* Görev Açıklaması Girişi */}
          <Text style={styles.label}>Görev Açıklaması</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Saha detayları, lokasyon ve yapılacak işlem talimatı..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* Atanacak Kullanıcı ID Girişi */}
          <Text style={styles.label}>Atanacak Kullanıcı ID (UserID) *</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor="#94A3B8"
            value={targetUserId}
            onChangeText={setTargetUserId}
            keyboardType="number-pad"
          />
          <Text style={styles.helperText}>
            Varsayılan olarak kendi Kullanıcı ID'niz ({user?.userID}) doldurulmuştur.
          </Text>

          {/* Gönder Butonu */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>+ Görevi Kaydet ve Ata</Text>
            )}
          </TouchableOpacity>

          {/* İptal Et Butonu */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>İptal Et</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Stil Tanımlamaları
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});

