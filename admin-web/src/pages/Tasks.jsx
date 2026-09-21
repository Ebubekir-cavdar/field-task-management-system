import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, PlusCircle, RefreshCw, Trash2, Eye, Mic, Image, MapPin, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { adminService } from '../api/adminService';
import TaskDetailModal from '../components/TaskDetailModal';

export default function Tasks() {
  const { refreshTrigger, onOpenCreateModal } = useOutletContext() || {};
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, userFilter, refreshTrigger]);

  const loadUsers = async () => {
    try {
      const data = await adminService.getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Kullanıcılar yüklenemedi:', err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllTasks(statusFilter, Number(userFilter) || null);
      setTasks(data || []);
    } catch (err) {
      console.error('Görevler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Görev #${taskId} silinecektir. Emin misiniz?`)) return;

    try {
      await adminService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.taskID !== taskId));
    } catch (err) {
      alert('Görev silinemedi: ' + (err.response?.data?.message || err.message));
    }
  };

  // Client-side search filter
  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchTitle = t.title?.toLowerCase().includes(q);
    const matchDesc = t.description?.toLowerCase().includes(q);
    const matchUser = `${t.userName} ${t.userSurname}`.toLowerCase().includes(q);
    return matchTitle || matchDesc || matchUser;
  });

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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Saha Görevleri Yönetimi</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sahaya atanan tüm görevleri filtreleyin, fotoğrafları ve ses kayıtlarını inceleyin.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Yeni Görev Ata</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg shadow-black/20">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: 'ALL', label: 'Tüm Görevler' },
            { key: 'ASSIGNED', label: 'Atananlar' },
            { key: 'IN_PROGRESS', label: 'Devam Edenler' },
            { key: 'COMPLETED', label: 'Tamamlananlar' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Worker Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Görev başlığı, açıklama veya personel adına göre ara..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* User Select & Refresh */}
          <div className="flex items-center gap-2">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Tüm Personeller</option>
              {users.map((u) => (
                <option key={u.userID} value={u.userID}>
                  {u.name} {u.surname}
                </option>
              ))}
            </select>

            <button
              onClick={loadTasks}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Task List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Görevler yükleniyor...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            Kriterlere uygun herhangi bir görev bulunamadı.
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile/tablet) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-4">ID</th>
                    <th className="p-4">Görev Başlığı</th>
                    <th className="p-4">Atanan Personel</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4">Medya Kanıtları</th>
                    <th className="p-4">Oluşturulma</th>
                    <th className="p-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTasks.map((t) => {
                    const badge = getStatusBadge(t.status);
                    return (
                      <tr
                        key={t.taskID}
                        onClick={() => setSelectedTask(t)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-mono text-slate-500 font-bold">#{t.taskID}</td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200 line-clamp-1">{t.title}</div>
                          <div className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                            {t.description || 'Açıklama yok'}
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-medium">
                          👤 {t.userName} {t.userSurname}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {t.proof_Image_Url && (
                              <span className="p-1 rounded bg-blue-500/10 text-blue-400" title="Fotoğraf Var">
                                <Image className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {t.audio_Url && (
                              <span className="p-1 rounded bg-indigo-500/10 text-indigo-400" title="Ses Kaydı Var">
                                <Mic className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {t.latitude != null && (
                              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400" title="GPS Konumu Var">
                                <MapPin className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {!t.proof_Image_Url && !t.audio_Url && !t.latitude && (
                              <span className="text-slate-600 text-[11px]">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[11px]">
                          {new Date(t.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedTask(t)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="İncele"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteTask(t.taskID, e)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card View (Shown on sm/md screens) */}
            <div className="block lg:hidden divide-y divide-slate-800">
              {filteredTasks.map((t) => {
                const badge = getStatusBadge(t.status);
                return (
                  <div
                    key={t.taskID}
                    onClick={() => setSelectedTask(t)}
                    className="p-4 hover:bg-slate-800/50 cursor-pointer space-y-2.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          #{t.taskID}
                        </span>
                        <h4 className="font-semibold text-xs text-white line-clamp-1">{t.title}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {t.description || 'Detaylı bir görev tanımı girilmemiş.'}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <div>👤 {t.userName} {t.userSurname}</div>
                      <div className="flex items-center gap-2">
                        {t.proof_Image_Url && <Image className="w-3.5 h-3.5 text-blue-400" />}
                        {t.audio_Url && <Mic className="w-3.5 h-3.5 text-indigo-400" />}
                        {t.latitude != null && <MapPin className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onDeleteTask={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t.taskID !== deletedId));
          }}
        />
      )}
    </div>
  );
}
