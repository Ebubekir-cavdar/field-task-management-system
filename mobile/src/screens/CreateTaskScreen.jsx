import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAdminStore } from '../store/useAdminStore';
import { useThemeStore } from '../store/useThemeStore';
import { lightTheme, darkTheme } from '../theme';

/**
 * Yeni Görev Oluşturma Ekranı Bileşeni.
 * Sadece 'Admin' rolüne sahip kullanıcılar erişebilir.
 * Saha personeline görev tanımlar ve personel listesinden seçim yaptırır.
 */
export default function CreateTaskScreen({ navigation }) {
  const { user } = useAuthStore();
  const { createTask, isLoading } = useTaskStore();
  const { users, fetchUsers } = useAdminStore();
  const { isDarkMode } = useThemeStore();
  const colors = isDarkMode ? darkTheme : lightTheme;

  // Form State'leri
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Yetki Kontrolü ve Kullanıcı Listesi Yükleme
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      Alert.alert('Erişim Engellendi', 'Yalnızca yöneticiler yeni görev oluşturabilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    const loadUsers = async () => {
      try {
        const userList = await fetchUsers();
        if (userList && userList.length > 0) {
          // Varsayılan olarak ilk kullanıcıyı seç
          setSelectedUser(userList[0]);
        }
      } catch (err) {
        // Hata
      }
    };
    loadUsers();
  }, [user]);

  /**
   * Görevi Kaydet ve Ata butonuna basıldığında çalışan form onay metodu.
   */
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen görev başlığını giriniz.');
      return;
    }
    if (!selectedUser) {
      Alert.alert('Eksik Bilgi', 'Lütfen görevin atanacağı personeli seçiniz.');
      return;
    }

    try {
      await createTask(title, description, selectedUser.userID.toString());
      Alert.alert('Başarılı', `Yeni görev ${selectedUser.name} ${selectedUser.surname} personeline başarıyla atandı.`, [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Hata', err.message || 'Görev oluşturulurken hata oluştu.');
    }
  };

  // Kullanıcı Arama Filtresi
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.name} ${u.surname}`.toLowerCase();
    const email = u.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Başlık ve Açıklama Metni */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Yeni Görev Ata</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
            Saha personeline yapılması gereken yeni bir iş görevi tanımlayın.
          </Text>
        </View>

        {/* Form Kartı */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Görev Başlığı Girişi */}
          <Text style={[styles.label, { color: colors.subtext }]}>Görev Başlığı *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Örn: Trafo Bakımı ve Fotoğraflama"
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle}
          />

          {/* Görev Açıklaması Girişi */}
          <Text style={[styles.label, { color: colors.subtext }]}>Görev Açıklaması</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Saha detayları, lokasyon ve yapılacak işlem talimatı..."
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* Atanacak Personel Seçici Butonu */}
          <Text style={[styles.label, { color: colors.subtext }]}>Atanacak Personel *</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setIsUserModalVisible(true)}
          >
            {selectedUser ? (
              <View style={styles.selectedUserContainer}>
                <View style={styles.userBadgeCircle}>
                  <Text style={styles.userBadgeLetter}>{selectedUser.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedUserName, { color: colors.text }]}>
                    {selectedUser.name} {selectedUser.surname}
                  </Text>
                  <Text style={[styles.selectedUserEmail, { color: colors.subtext }]}>
                    {selectedUser.email} ({selectedUser.role})
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Değiştir ▼</Text>
              </View>
            ) : (
              <Text style={{ color: colors.placeholder }}>Personel Seçiniz...</Text>
            )}
          </TouchableOpacity>

          {/* Gönder Butonu */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
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
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>İptal Et</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Personel Seçim Modalı */}
      <Modal
        visible={isUserModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Personel Seçimi</Text>
              <TouchableOpacity onPress={() => setIsUserModalVisible(false)}>
                <Text style={[styles.modalCloseText, { color: colors.subtext }]}>Kapat ✕</Text>
              </TouchableOpacity>
            </View>

            {/* Arama Alanı */}
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Personel adı veya e-posta ile ara..."
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Personel Listesi */}
            <ScrollView style={{ maxHeight: 350 }}>
              {filteredUsers.map((u) => {
                const isSelected = selectedUser?.userID === u.userID;
                return (
                  <TouchableOpacity
                    key={u.userID}
                    style={[
                      styles.userItemOption,
                      { borderColor: colors.border },
                      isSelected && { borderColor: colors.primary, backgroundColor: isDarkMode ? '#1E3A8A' : '#EFF6FF' },
                    ]}
                    onPress={() => {
                      setSelectedUser(u);
                      setIsUserModalVisible(false);
                    }}
                  >
                    <View style={styles.userBadgeCircle}>
                      <Text style={styles.userBadgeLetter}>{u.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.userNameText, { color: colors.text }]}>
                        {u.name} {u.surname}
                      </Text>
                      <Text style={[styles.userEmailText, { color: colors.subtext }]}>{u.email}</Text>
                    </View>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{u.role}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  selectedUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userBadgeLetter: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  selectedUserName: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectedUserEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  submitButton: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  userItemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 12,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleTagText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
});
