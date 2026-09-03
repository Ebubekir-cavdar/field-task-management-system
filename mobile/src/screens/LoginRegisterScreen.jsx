import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Kullanıcı Giriş ve Kayıt Ekranı Bileşeni.
 * İki ayrı sekmeye (Giriş Yap / Kayıt Ol) sahiptir ve Zustand AuthStore metodlarını çağırır.
 */
export default function LoginRegisterScreen() {
  // Aktif sekme durumu (true: Giriş Yap sekmesi, false: Kayıt Ol sekmesi)
  const [isLoginTab, setIsLoginTab] = useState(true);

  // Form İnput Durumları (Local State)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');

  // Global Auth Store'dan metod ve yüklenme durumları alınır
  const { login, register, isLoading, error } = useAuthStore();

  /**
   * Giriş Yap butonuna basıldığında tetiklenir.
   */
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('Giriş Başarısız', err.message || 'Giriş yapılamadı.');
    }
  };

  /**
   * Kayıt Ol butonuna basıldığında tetiklenir.
   */
  const handleRegister = async () => {
    if (!name.trim() || !surname.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurunuz.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Zayıf Şifre', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    try {
      await register(name, surname, email, password);
      Alert.alert('Başarılı', 'Kullanıcı kaydınız oluşturuldu. Şimdi giriş yapabilirsiniz.', [
        { text: 'Tamam', onPress: () => setIsLoginTab(true) },
      ]);
    } catch (err) {
      Alert.alert('Kayıt Başarısız', err.message || 'Kayıt olunamadı.');
    }
  };

  return (
    // Klavyenin formu kapatmasını engelleyen konteyner
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Başlık Alanı */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Saha Görev Yönetimi</Text>
          <Text style={styles.appSubtitle}>Mobil Saha Ekip Portalı</Text>
        </View>

        {/* Form Kartı */}
        <View style={styles.card}>
          {/* Sekme Değiştirici (Tab Switcher: Giriş Yap / Kayıt Ol) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, isLoginTab && styles.activeTab]}
              onPress={() => setIsLoginTab(true)}
            >
              <Text style={[styles.tabText, isLoginTab && styles.activeTabText]}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, !isLoginTab && styles.activeTab]}
              onPress={() => setIsLoginTab(false)}
            >
              <Text style={[styles.tabText, !isLoginTab && styles.activeTabText]}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          {/* Kayıt Ol sekmesinde ekstra çıkan Ad ve Soyad alanları */}
          {!isLoginTab && (
            <>
              <Text style={styles.label}>Ad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ahmet"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Yılmaz"
                placeholderTextColor="#94A3B8"
                value={surname}
                onChangeText={setSurname}
                autoCapitalize="words"
              />
            </>
          )}

          {/* E-Posta Adresi İnputu */}
          <Text style={styles.label}>E-Posta Adresi</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@saha.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Şifre İnputu */}
          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Varsa Hata Mesajı Gösterimi */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Gönder (Giriş / Kayıt) Butonu */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={isLoginTab ? handleLogin : handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLoginTab ? 'Oturum Aç' : 'Kayıt İşlemini Tamamla'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Stil Tanımlamaları
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 10,
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
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
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
});

