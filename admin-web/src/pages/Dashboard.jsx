import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckSquare, Clock, CheckCircle2, Users, PlusCircle, ArrowUpRight, MapPin, RefreshCw } from 'lucide-react';
import { adminService } from '../api/adminService';
import MapView from '../components/MapView';
import TaskDetailModal from '../components/TaskDetailModal';

export default function Dashboard() {
  const { refreshTrigger, onOpenCreateModal } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, tasksData] = await Promise.all([
        adminService.getStats(),
        adminService.getAllTasks('ALL'),
      ]);
      setStats(statsData);
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Dashboard veri hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'Tamamlandı', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'IN_PROGRESS':
        return { label: 'Devam Ediyor', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      default:
        return { label: 'Atandı', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Genel Saha Özeti</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tüm saha operasyonlarının anlık durumları, KPI sayaçları ve canlı harita.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Verileri Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenCreateModal}
            className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yeni Görev Ata</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Grid (Responsive 1 -> 2 -> 4 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Görev</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">
              {stats?.totalTasks ?? (loading ? '...' : 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Sistemdeki tüm kayıtlar</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        {/* Assigned Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Atanan (Bekleyen)</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 mt-1.5">
              {stats?.assignedTasks ?? (loading ? '...' : 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Başlatılmayı bekleyen</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* In Progress Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Devam Eden</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1.5">
              {stats?.inProgressTasks ?? (loading ? '...' : 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Sahada işlem gören</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tamamlanan</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1.5">
              {stats?.completedTasks ?? (loading ? '...' : 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Kanıtlı ve onaylı</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Canlı Saha GPS Haritası</h3>
              <p className="text-xs text-slate-400">Tamamlanan ve sahadaki görevlerin GPS koordinatları</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tamamlandı
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Devam Ediyor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Atandı
            </span>
          </div>
        </div>

        <MapView tasks={tasks} onSelectTask={(task) => setSelectedTask(task)} height="420px" />
      </div>

      {/* Recent Tasks List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Son Görev Hareketleri</h3>
          <span className="text-xs text-slate-400 font-mono">Toplam {tasks.length} Görev</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Veriler yükleniyor...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">Henüz hiç görev bulunmuyor.</div>
        ) : (
          <div className="space-y-2.5">
            {tasks.slice(0, 6).map((t) => {
              const badge = getStatusBadge(t.status);
              return (
                <div
                  key={t.taskID}
                  onClick={() => setSelectedTask(t)}
                  className="p-3.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      #{t.taskID}
                    </span>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-100 line-clamp-1">{t.title}</h4>
                      <div className="text-xs text-slate-400 mt-0.5">
                        👤 {t.userName} {t.userSurname}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-[11px] text-slate-500 font-mono">
                      {new Date(t.created_at).toLocaleDateString('tr-TR')}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-500 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onDeleteTask={() => loadData()}
        />
      )}
    </div>
  );
}
