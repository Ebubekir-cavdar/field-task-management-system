import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Trash2, ExternalLink, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../api/axiosClient';
import { adminService } from '../api/adminService';
import AudioPlayer from './AudioPlayer';

export default function TaskDetailModal({ task, isOpen, onClose, onDeleteTask }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [imageZoom, setImageZoom] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && task?.taskID) {
      loadLogs(task.taskID);
      setConfirmDelete(false);
    }
  }, [isOpen, task?.taskID]);

  const loadLogs = async (taskId) => {
    setLoadingLogs(true);
    try {
      const data = await adminService.getTaskLogs(taskId);
      setLogs(data || []);
    } catch (err) {
      console.error('Loglar yüklenemedi:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.taskID) return;
    setIsDeleting(true);
    try {
      await adminService.deleteTask(task.taskID);
      if (onDeleteTask) onDeleteTask(task.taskID);
      onClose();
    } catch (err) {
      alert('Görev silinemedi: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !task) return null;

  const proofUrl = task.proof_Image_Url ? `${API_BASE_URL}${task.proof_Image_Url}` : null;
  const audioUrl = task.audio_Url ? `${API_BASE_URL}${task.audio_Url}` : null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'TAMAMLANDI', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'IN_PROGRESS':
        return { label: 'DEVAM EDİYOR', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      default:
        return { label: 'ATANDI', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

  const badge = getStatusBadge(task.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
              #{task.taskID}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
              {badge.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-xs flex items-center gap-1"
                title="Görevi Sil"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Sil</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-xl">
                <span className="text-[11px] text-red-400 font-semibold">Silinsin mi?</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                >
                  {isDeleting ? '...' : 'Evet'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]"
                >
                  İptal
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Title & Worker */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{task.title}</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>👤 Atanan Personel:</span>
              <span className="text-slate-200 font-semibold">{task.userName} {task.userSurname}</span>
            </p>
          </div>

          {/* Description */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Görev Tanımı</h4>
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {task.description || 'Detaylı bir görev tanımı girilmemiş.'}
            </p>
          </div>

          {/* Timing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Oluşturulma</span>
              </div>
              <div className="font-semibold text-xs text-slate-200">
                {new Date(task.created_at).toLocaleString('tr-TR')}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Başlatılma</span>
              </div>
              <div className="font-semibold text-xs text-slate-200">
                {task.started_at ? new Date(task.started_at).toLocaleString('tr-TR') : 'Henüz Başlatılmadı'}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tamamlanma</span>
              </div>
              <div className="font-semibold text-xs text-slate-200">
                {task.completed_at ? new Date(task.completed_at).toLocaleString('tr-TR') : 'Tamamlanmadı'}
              </div>
            </div>
          </div>

          {/* Media Section: Proof Photo & Voice Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proof Photo */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>📷</span> Sahadan Kanıt Fotoğrafı
              </h4>
              {proofUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div
                    onClick={() => setImageZoom(true)}
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 max-h-56 w-full flex items-center justify-center bg-black/40"
                  >
                    <img
                      src={proofUrl}
                      alt="Kanıt Fotoğrafı"
                      className="object-contain max-h-56 w-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white gap-1.5">
                      <ExternalLink className="w-4 h-4" /> Büyüt
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 font-mono">{task.proof_Image_Url}</span>
                </div>
              ) : (
                <div className="flex-1 min-h-[140px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-700/60 rounded-xl">
                  Henüz fotoğraf yüklenmemiş
                </div>
              )}
            </div>

            {/* Voice Note & GPS Info */}
            <div className="space-y-4">
              {/* Voice Note */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span>🎙️</span> Sesli Saha Açıklaması
                </h4>
                {audioUrl ? (
                  <AudioPlayer src={audioUrl} title={`Görev #${task.taskID} Sesli Notu`} />
                ) : (
                  <div className="p-3 text-xs text-slate-500 border border-dashed border-slate-700/60 rounded-xl text-center">
                    Ses kaydı eklenmemiş
                  </div>
                )}
              </div>

              {/* GPS Info */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📍</span> Tamamlanma Konumu
                </h4>
                {task.latitude != null && task.longitude != null ? (
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span>Lat: {Number(task.latitude).toFixed(6)}</span>
                      <span>Lng: {Number(task.longitude).toFixed(6)}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${task.latitude},${task.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Google Maps'te Aç</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">GPS koordinatı kaydedilmemiş</div>
                )}
              </div>
            </div>
          </div>

          {/* Task Audit Logs */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>📋</span> Görev Hareket Tarihçesi (Audit Logs)
            </h4>
            {loadingLogs ? (
              <div className="text-xs text-slate-400 py-2">Loglar yükleniyor...</div>
            ) : logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.taskLogID}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="font-semibold text-slate-200">{log.action}</span>
                      <span className="text-slate-400">({log.userName} {log.userSurname})</span>
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {new Date(log.timeStamp).toLocaleString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500">Kayıtlı hareket geçmişi bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Lightbox */}
      {imageZoom && proofUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setImageZoom(false)}
        >
          <img
            src={proofUrl}
            alt="Büyütülmüş Kanıt Fotoğrafı"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
          <button
            onClick={() => setImageZoom(false)}
            className="absolute top-5 right-5 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
