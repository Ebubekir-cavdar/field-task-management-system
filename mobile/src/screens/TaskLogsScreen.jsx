import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTaskStore } from '../store/useTaskStore';

/**
 * Görev Hareket Geçmişi (Log Audit Timeline) Ekran Bileşeni.
 * Seçili göreve ait kronolojik zaman çizelgesini görselleştirir.
 */
export default function TaskLogsScreen({ route }) {
  // Navigasyon parametresi ile aktarılan taskId
  const { taskId } = route.params;

  // Task Store'dan log verileri ve indirme metodu
  const { taskLogs, fetchTaskLogs, isLoading } = useTaskStore();

  // Ekran yüklendiğinde görevin geçmiş log kayıtlarını sunucudan çek
  useEffect(() => {
    fetchTaskLogs(taskId);
  }, [taskId]);

  /**
   * Log eylemine göre (CREATED, STARTED, COMPLETED) rozet etiket ve renklerini seçer.
   */
  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATED':
        return { label: 'OLUŞTURULDU', color: '#3B82F6' };
      case 'STARTED':
        return { label: 'BAŞLATILDI', color: '#F59E0B' };
      case 'COMPLETED':
        return { label: 'TAMAMLANDI', color: '#10B981' };
      default:
        return { label: action, color: '#94A3B8' };
    }
  };

  /**
   * Zaman çizelgesi elemanlarını (Timeline Item) render eden fonksiyon
   */
  const renderLogItem = ({ item, index }) => {
    const badge = getActionBadge(item.action);
    return (
      <View style={styles.logItemContainer}>
        {/* Zaman Çizelgesi Sol Çizgi ve Nokta (Timeline Indicator) */}
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: badge.color }]} />
          {/* Son eleman değilse iki nokta arasına dikey çizgi çiz */}
          {index !== taskLogs.length - 1 && <View style={styles.timelineLine} />}
        </View>

        {/* Log Kartı */}
        <View style={styles.logCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.actionText, { color: badge.color }]}>{badge.label}</Text>
            <Text style={styles.timeText}>
              {new Date(item.timeStamp).toLocaleString('tr-TR')}
            </Text>
          </View>

          <Text style={styles.performedByText}>
            İşlemi Yapan: {item.userName} {item.userSurname} (ID: {item.userID})
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Başlık */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Görev Hareketleri (Logs)</Text>
        <Text style={styles.headerSubtitle}>Görev ID: #{taskId}</Text>
      </View>

      {/* İçerik Yüklenme Durumu ve Liste */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loglar Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={taskLogs}
          keyExtractor={(item) => item.taskLogID.toString()}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Bu göreve ait log kaydı bulunamadı.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// Stil Nesnesi
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  listContent: {
    padding: 20,
  },
  logItemContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#334155',
    marginTop: 4,
  },
  logCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  performedByText: {
    fontSize: 13,
    color: '#CBD5E1',
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
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});

