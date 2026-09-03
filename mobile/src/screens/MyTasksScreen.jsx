import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Kullanıcının Kendisine Atanmış Görevleri Listelediği Ana Ekran Bileşeni.
 * Görev durumlarına göre (Tümü, Atanan, Devam Eden, Tamamlanan) filtreleme ve Pull-to-Refresh özelliğine sahiptir.
 */
export default function MyTasksScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { myTasks, fetchMyTasks, isLoading } = useTaskStore();

  // Filtreleme Durumu ('ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED')
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Ekran ilk yüklendiğinde kullanıcının görevlerini API'den çek
  useEffect(() => {
    fetchMyTasks();
  }, []);

  /**
   * Görev durumuna göre rozet (badge) etiketi, metin rengi ve arka plan rengini belirler.
   */
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

  // Seçili filtreye göre görev listesini süz
  const filteredTasks = myTasks.filter((task) => {
    if (filterStatus === 'ALL') return true;
    return task.status === filterStatus;
  });

  /**
   * FlatList için her bir görev kartının render edildiği fonksiyon
   */
  const renderTaskItem = ({ item }) => {
    const badge = getStatusBadge(item.status);
    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('TaskDetail', { taskId: item.taskID })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {/* Durum Rozeti */}
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description || 'Açıklama belirtilmemiş.'}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            Oluşturulma: {new Date(item.created_at).toLocaleDateString('tr-TR')}
          </Text>
          <Text style={styles.detailLink}>Detay →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Üst Kullanıcı Bilgi Barı */}
      <View style={styles.userHeader}>
        <View>
          <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
          <Text style={styles.userNameText}>
            {user?.name} {user?.surname}
          </Text>
        </View>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      {/* Filtreleme Sekmeleri (Filter Chips) */}
      <View style={styles.filterContainer}>
        {[
          { key: 'ALL', label: 'Tümü' },
          { key: 'ASSIGNED', label: 'Atanan' },
          { key: 'IN_PROGRESS', label: 'Devam Eden' },
          { key: 'COMPLETED', label: 'Tamamlanan' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterChip, filterStatus === tab.key && styles.activeFilterChip]}
            onPress={() => setFilterStatus(tab.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === tab.key && styles.activeFilterChipText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Görev Listesi (FlatList) */}
      {isLoading && myTasks.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Görevler Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.taskID.toString()}
          renderItem={renderTaskItem}
          contentContainerStyle={styles.listContent}
          // Aşağı Çekip Yenileme Özelliği (Pull to Refresh)
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchMyTasks}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          // Liste Boş İse Gösterilecek Alan
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Görev Bulunamadı</Text>
              <Text style={styles.emptySubtitle}>
                {filterStatus === 'ALL'
                  ? 'Henüz üzerinize atanmış bir görev bulunmuyor.'
                  : 'Bu filtreye uygun görev bulunamadı.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Sağ Alttaki Yuvarlak Yeni Görev Ekleme Butonu (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Stil Nesnesi
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  welcomeText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeFilterChip: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  taskCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  taskDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 36,
  },
});

