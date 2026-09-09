import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { useThemeStore } from '../store/useThemeStore';
import { lightTheme, darkTheme } from '../theme';

/**
 * Yönetici (Admin) Paneli Ana Ekran Bileşeni.
 * Yalnızca 'Admin' rolüne sahip kullanıcılar tarafından görüntülenebilir.
 * 3 Sekme içerir:
 * 1. İstatistikler (Saha Genel Bakış ve KPI Metrikleri)
 * 2. Tüm Görevler (Filtreleme, Detay İnceleme ve Görev Silme)
 * 3. Personeller (Ekip Listesi, Görev Sayıları ve Rol Değiştirme)
 */
export default function AdminDashboardScreen({ navigation }) {
  const {
    stats,
    users,
    allTasks,
    isLoading,
    fetchStats,
    fetchUsers,
    fetchAllTasks,
    updateUserRole,
    deleteTask,
  } = useAdminStore();

  const { isDarkMode, toggleTheme } = useThemeStore();
  const colors = isDarkMode ? darkTheme : lightTheme;

  // Aktif Sekme: 'STATS', 'TASKS', 'USERS'
  const [activeTab, setActiveTab] = useState('STATS');
  // Görevler sekmesindeki durum filtresi: 'ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'
  const [taskFilter, setTaskFilter] = useState('ALL');

  // Ekran her odaklandığında güncel verileri çek
  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchAllTasks(taskFilter),
      ]);
    } catch (err) {
      // Hata yakalama
    }
  }, [taskFilter]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  /**
   * Görev Durum Rozeti Ayarları
   */
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

  /**
   * Görevi Sistemden Silme Onayı
   */
  const handleDeleteTask = (taskId, taskTitle) => {
    Alert.alert(
      'Görevi Sil',
      `"${taskTitle}" başlıklı görevi ve tüm geçmiş kayıtlarını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(taskId);
              Alert.alert('Başarılı', 'Görev sistemden silindi.');
            } catch (err) {
              Alert.alert('Hata', err.message || 'Görev silinemedi.');
            }
          },
        },
      ]
    );
  };

  /**
   * Personel Rolünü Değiştirme Onayı
   */
  const handleToggleRole = (user) => {
    if (user.userID === 1) {
      Alert.alert('Bilgi', 'Sistem ana yöneticisinin (ID: 1) rolü değiştirilemez.');
      return;
    }

    const newRole = user.role === 'Admin' ? 'Worker' : 'Admin';
    const actionText = newRole === 'Admin' ? 'Yönetici (Admin)' : 'Saha Personeli (Worker)';

    Alert.alert(
      'Rol Değişikliği',
      `${user.name} ${user.surname} kullanıcısının rolünü "${actionText}" olarak değiştirmek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Rolü Güncelle',
          onPress: async () => {
            try {
              await updateUserRole(user.userID, newRole);
              Alert.alert('Başarılı', `Kullanıcı rolü "${actionText}" olarak güncellendi.`);
            } catch (err) {
              Alert.alert('Hata', err.message || 'Rol güncellenirken hata oluştu.');
            }
          },
        },
      ]
    );
  };

  // Filtrelenmiş Görev Listesi
  const filteredTasks = allTasks.filter((task) => {
    if (taskFilter === 'ALL') return true;
    return task.status === taskFilter;
  });

  // Tamamlanma Başarı Oranı
  const completionRate =
    stats && stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Üst Yönetici Başlığı */}
      <View style={[styles.topHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.title, { color: colors.text }]}>👑 Yönetici Paneli</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
            Saha operasyonları ve personel yönetim merkezi
          </Text>
        </View>

        {/* Tema Değiştirme & Yeni Görev Ata Butonları */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.themeToggleButton, { backgroundColor: colors.buttonBg, borderColor: colors.border }]}
            onPress={toggleTheme}
          >
            <Text style={[styles.themeToggleText, { color: colors.text }]}>
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <Text style={styles.createButtonText}>+ Görev Ata</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sekme Butonları (Segmented Navigation) */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'STATS' && [styles.activeTabItem, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('STATS')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.tabText,
              { color: activeTab === 'STATS' ? colors.primary : (isDarkMode ? '#CBD5E1' : '#334155') },
              activeTab === 'STATS' && styles.activeTabText,
            ]}
          >
            📊 İstatistikler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'TASKS' && [styles.activeTabItem, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('TASKS')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.tabText,
              { color: activeTab === 'TASKS' ? colors.primary : (isDarkMode ? '#CBD5E1' : '#334155') },
              activeTab === 'TASKS' && styles.activeTabText,
            ]}
          >
            📋 Tüm Görevler ({allTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'USERS' && [styles.activeTabItem, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('USERS')}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.tabText,
              { color: activeTab === 'USERS' ? colors.primary : (isDarkMode ? '#CBD5E1' : '#334155') },
              activeTab === 'USERS' && styles.activeTabText,
            ]}
          >
            👥 Personeller ({users.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sekme İçerikleri */}
      {activeTab === 'STATS' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadAllData} tintColor={colors.primary} />
          }
        >
          {/* Başarı Oranı Kartı */}
          <View style={[styles.kpiCardHighlight, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.kpiRow}>
              <View>
                <Text style={[styles.kpiLabel, { color: colors.subtext }]}>Saha Tamamlanma Oranı</Text>
                <Text style={[styles.kpiBigNumber, { color: '#10B981' }]}>%{completionRate}</Text>
              </View>
              <View style={[styles.kpiIconCircle, { backgroundColor: isDarkMode ? '#064E3B' : '#D1FAE5' }]}>
                <Text style={{ fontSize: 24 }}>🎯</Text>
              </View>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
              <View style={[styles.progressBarFill, { width: `${completionRate}%`, backgroundColor: '#10B981' }]} />
            </View>
          </View>

          {/* Görev Dağılımı KPI Izgarası */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Görev Durumları</Text>
          <View style={styles.gridContainer}>
            <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.gridCardIcon}>📋</Text>
              <Text style={[styles.gridCardNumber, { color: colors.text }]}>{stats?.totalTasks ?? 0}</Text>
              <Text style={[styles.gridCardLabel, { color: colors.subtext }]}>Toplam Görev</Text>
            </View>

            <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.gridCardIcon}>⏳</Text>
              <Text style={[styles.gridCardNumber, { color: '#3B82F6' }]}>{stats?.assignedTasks ?? 0}</Text>
              <Text style={[styles.gridCardLabel, { color: colors.subtext }]}>Bekleyen / Atanan</Text>
            </View>

            <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.gridCardIcon}>⚡</Text>
              <Text style={[styles.gridCardNumber, { color: '#F59E0B' }]}>{stats?.inProgressTasks ?? 0}</Text>
              <Text style={[styles.gridCardLabel, { color: colors.subtext }]}>Devam Eden</Text>
            </View>

            <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.gridCardIcon}>✅</Text>
              <Text style={[styles.gridCardNumber, { color: '#10B981' }]}>{stats?.completedTasks ?? 0}</Text>
              <Text style={[styles.gridCardLabel, { color: colors.subtext }]}>Tamamlanan</Text>
            </View>
          </View>

          {/* Personel Dağılımı KPI Izgarası */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Kullanıcı & Roller</Text>
          <View style={styles.gridContainer}>
            <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.gridCardIcon}>👥</Text>
              <Text style={[styles.gridCardNumber, { color: colors.text }]}>{stats?.totalUsers ?? 0}</Text>
              <Text style={[styles.gridCardLabel, { color: colors.subtext }]}>Toplam Kayıtlı</Text>
            </View>

            <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.gridCardIcon}>👷</Text>
              <Text style={[styles.gridCardNumber, { color: '#3B82F6' }]}>{stats?.workerCount ?? 0}</Text>
              <Text style={[styles.gridCardLabel, { color: colors.subtext }]}>Saha Personeli</Text>
            </View>

            <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.gridCardIcon}>👑</Text>
              <Text style={[styles.gridCardNumber, { color: '#8B5CF6' }]}>{stats?.adminCount ?? 0}</Text>
              <Text style={[styles.gridCardLabel, { color: colors.subtext }]}>Yönetici</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Sekme 2: Tüm Görevler */}
      {activeTab === 'TASKS' && (
        <View style={{ flex: 1 }}>
          {/* Görev Filtreleri */}
          <View style={styles.filterBar}>
            {[
              { key: 'ALL', label: 'Tümü' },
              { key: 'ASSIGNED', label: 'Atanan' },
              { key: 'IN_PROGRESS', label: 'Devam Eden' },
              { key: 'COMPLETED', label: 'Tamamlanan' },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  taskFilter === f.key && styles.activeFilterChip,
                ]}
                onPress={() => setTaskFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.subtext },
                    taskFilter === f.key && styles.activeFilterChipText,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.taskID.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={loadAllData} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.subtext }]}>Bu filtreye uygun görev bulunamadı.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const badge = getStatusBadge(item.status);
              return (
                <View style={[styles.taskItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.taskTitleText, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.taskDescText, { color: colors.subtext }]} numberOfLines={2}>
                    {item.description || 'Açıklama belirtilmemiş.'}
                  </Text>

                  {/* Atanan Personel ve Tarih Bilgisi */}
                  <View style={[styles.workerInfoRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.workerNameText, { color: colors.text }]}>
                      👤 Atanan: <Text style={{ fontWeight: '700' }}>{item.userName} {item.userSurname}</Text>
                    </Text>
                    <Text style={[styles.dateText, { color: colors.subtext }]}>
                      {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>

                  {/* Aksiyon Butonları (İncele & Sil) */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => navigation.navigate('TaskDetail', { taskId: item.taskID })}
                    >
                      <Text style={styles.viewButtonText}>İncele / Detay →</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteTask(item.taskID, item.title)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️ Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Sekme 3: Personel Yönetimi */}
      {activeTab === 'USERS' && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.userID.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadAllData} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const isAdmin = item.role === 'Admin';
            return (
              <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.userCardHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
                      {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {item.name} {item.surname}
                      </Text>
                      {item.userID === 1 && (
                        <Text style={styles.creatorBadge}>Kurucu</Text>
                      )}
                    </View>
                    <Text style={[styles.userEmail, { color: colors.subtext }]}>{item.email}</Text>
                  </View>

                  {/* Rol Rozeti */}
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: isAdmin ? (isDarkMode ? '#4C1D95' : '#EDE9FE') : (isDarkMode ? '#1E3A8A' : '#DBEAFE') },
                    ]}
                  >
                    <Text style={[styles.roleBadgeText, { color: isAdmin ? '#8B5CF6' : '#3B82F6' }]}>
                      {isAdmin ? '👑 Admin' : '👷 Worker'}
                    </Text>
                  </View>
                </View>

                {/* Görev İstatistikleri */}
                <View style={[styles.userStatsRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.userStatItem, { color: colors.subtext }]}>
                    📋 Atanan: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.assignedTasksCount}</Text>
                  </Text>
                  <Text style={[styles.userStatItem, { color: colors.subtext }]}>
                    ✅ Tamamlanan: <Text style={{ color: '#10B981', fontWeight: '700' }}>{item.completedTasksCount}</Text>
                  </Text>

                  {/* Rol Değiştirme Butonu */}
                  {item.userID !== 1 ? (
                    <TouchableOpacity
                      style={[
                        styles.toggleRoleButton,
                        { borderColor: isAdmin ? '#3B82F6' : '#8B5CF6' },
                      ]}
                      onPress={() => handleToggleRole(item)}
                    >
                      <Text style={[styles.toggleRoleButtonText, { color: isAdmin ? '#3B82F6' : '#8B5CF6' }]}>
                        {isAdmin ? 'Worker Yap' : 'Admin Yap'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.protectedText, { color: colors.subtext }]}>Değiştirilemez</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  createButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  themeToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiCardHighlight: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  kpiBigNumber: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  gridCardIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  gridCardNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  gridCardLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  activeFilterChip: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  taskItemCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitleText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  taskDescText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  workerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
    marginBottom: 10,
  },
  workerNameText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#2563EB',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  userCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  creatorBadge: {
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  userStatItem: {
    fontSize: 12,
  },
  toggleRoleButton: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleRoleButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  protectedText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
