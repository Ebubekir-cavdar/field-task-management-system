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
import { useThemeStore } from '../store/useThemeStore';
import { lightTheme, darkTheme } from '../theme';

/**
 * Görev Hareket Geçmişi (Log Audit Timeline) Ekran Bileşeni.
 * Seçili göreve ait kronolojik zaman çizelgesini görselleştirir.
 */
export default function TaskLogsScreen({ route }) {
  // Navigasyon parametresi ile aktarılan taskId
  const { taskId } = route.params;

  // Task Store ve Theme Store'dan log verileri ve tema al
  const { taskLogs, fetchTaskLogs, isLoading } = useTaskStore();
  const { isDarkMode } = useThemeStore();
  const colors = isDarkMode ? darkTheme : lightTheme;

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
          {index !== taskLogs.length - 1 && (
            <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
          )}
        </View>

        {/* Log Kartı */}
        <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.actionText, { color: badge.color }]}>{badge.label}</Text>
            <Text style={[styles.timeText, { color: colors.subtext }]}>
              {new Date(item.timeStamp).toLocaleString('tr-TR')}
            </Text>
          </View>

          <Text style={[styles.performedByText, { color: colors.subtext }]}>
            İşlemi Yapan: {item.userName} {item.userSurname} (ID: {item.userID})
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Üst Başlık */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Görev Hareketleri (Logs)</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Görev ID: #{taskId}</Text>
      </View>

      {/* İçerik Yüklenme Durumu ve Liste */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loglar Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={taskLogs}
          keyExtractor={(item) => item.taskLogID.toString()}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Bu göreve ait log kaydı bulunamadı.</Text>
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

