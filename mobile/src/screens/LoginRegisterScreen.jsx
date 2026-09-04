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
  StatusBar,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { lightTheme, darkTheme } from '../theme';

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

  // Global Auth Store ve Theme Store
  const { login, register, isLoading, error } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const colors = isDarkMode ? darkTheme : lightTheme;

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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Üst Sağ Tema Değiştirme Butonu */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.themeToggleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={toggleTheme}
          >
            <Text style={[styles.themeToggleText, { color: colors.text }]}>
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Başlık Alanı */}
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: colors.text }]}>Saha Görev Yönetimi</Text>
          <Text style={[styles.appSubtitle, { color: colors.subtext }]}>Mobil Saha Ekip Portalı</Text>
        </View>

        {/* Form Kartı */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Sekme Değiştirici (Tab Switcher: Giriş Yap / Kayıt Ol) */}
          <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.tabButton, isLoginTab && { backgroundColor: colors.primary }]}
              onPress={() => setIsLoginTab(true)}
            >
              <Text style={[styles.tabText, { color: isLoginTab ? '#FFFFFF' : colors.subtext }]}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, !isLoginTab && { backgroundColor: colors.primary }]}
              onPress={() => setIsLoginTab(false)}
            >
              <Text style={[styles.tabText, { color: !isLoginTab ? '#FFFFFF' : colors.subtext }]}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          {/* Kayıt Ol sekmesinde ekstra çıkan Ad ve Soyad alanları */}
          {!isLoginTab && (
            <>
              <Text style={[styles.label, { color: colors.subtext }]}>Ad</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Ahmet"
                placeholderTextColor={colors.placeholder}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={[styles.label, { color: colors.subtext }]}>Soyad</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Yılmaz"
                placeholderTextColor={colors.placeholder}
                value={surname}
                onChangeText={setSurname}
                autoCapitalize="words"
              />
            </>
          )}

          {/* E-Posta Adresi İnputu */}
          <Text style={[styles.label, { color: colors.subtext }]}>E-Posta Adresi</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="ornek@saha.com"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Şifre İnputu */}
          <Text style={[styles.label, { color: colors.subtext }]}>Şifre</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="••••••••"
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Varsa Hata Mesajı Gösterimi */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Gönder (Giriş / Kayıt) Butonu */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  topBar: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  themeToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
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

