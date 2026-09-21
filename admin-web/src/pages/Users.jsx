import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, ShieldCheck, HardHat, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { adminService } from '../api/adminService';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Kullanıcılar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (user) => {
    if (user.userID === 1) {
      alert('Sistem kurucusunun (ID: 1) rolü değiştirilemez.');
      return;
    }

    const newRole = user.role === 'Admin' ? 'Worker' : 'Admin';
    const confirmMsg = `${user.name} ${user.surname} kullanıcısının rolü '${newRole}' olarak güncellensin mi?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(user.userID);
    try {
      await adminService.updateUserRole(user.userID, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.userID === user.userID ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      alert('Rol güncellenemedi: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Personel ve Rol Yönetimi</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sistemdeki tüm saha personellerini ve yöneticileri görüntüleyin, rolleri düzenleyin.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start sm:self-auto"
          title="Listeyi Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Users Table / Card Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Personel listesi yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">Kayıtlı personel bulunamadı.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-4">ID</th>
                    <th className="p-4">Personel</th>
                    <th className="p-4">E-Posta</th>
                    <th className="p-4">Mevcut Rol</th>
                    <th className="p-4">Toplam Görev</th>
                    <th className="p-4">Tamamlanan</th>
                    <th className="p-4 text-right">Rol Değiştir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => {
                    const isAdmin = u.role === 'Admin';
                    const isRootAdmin = u.userID === 1;

                    return (
                      <tr key={u.userID} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono text-slate-500 font-bold">#{u.userID}</td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            {isAdmin ? (
                              <ShieldCheck className="w-4 h-4 text-blue-400" />
                            ) : (
                              <HardHat className="w-4 h-4 text-amber-400" />
                            )}
                            <span>{u.name} {u.surname}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Kayıt: {new Date(u.created_at).toLocaleDateString('tr-TR')}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-300">{u.email}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isAdmin
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-200">
                          {u.assignedTasksCount ?? 0}
                        </td>
                        <td className="p-4 font-bold text-emerald-400">
                          {u.completedTasksCount ?? 0}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleRoleToggle(u)}
                            disabled={isRootAdmin || updatingId === u.userID}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                              isRootAdmin
                                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                                : isAdmin
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {updatingId === u.userID
                              ? 'Kaydediliyor...'
                              : isRootAdmin
                              ? 'Kurucu (Sabit)'
                              : isAdmin
                              ? 'Worker Yap'
                              : 'Admin Yap'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="block lg:hidden divide-y divide-slate-800">
              {users.map((u) => {
                const isAdmin = u.role === 'Admin';
                const isRootAdmin = u.userID === 1;

                return (
                  <div key={u.userID} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <ShieldCheck className="w-5 h-5 text-blue-400" />
                        ) : (
                          <HardHat className="w-5 h-5 text-amber-400" />
                        )}
                        <div>
                          <div className="font-bold text-xs text-white">
                            {u.name} {u.surname}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isAdmin
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Toplam: <strong className="text-white">{u.assignedTasksCount ?? 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Tamamlanan: <strong>{u.completedTasksCount ?? 0}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRoleToggle(u)}
                      disabled={isRootAdmin || updatingId === u.userID}
                      className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                        isRootAdmin
                          ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                          : isAdmin
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {updatingId === u.userID
                        ? 'Güncelleniyor...'
                        : isRootAdmin
                        ? 'Sistem Kurucusu (Rol Sabit)'
                        : isAdmin
                        ? 'Worker (Saha Personeli) Yap'
                        : 'Admin (Yönetici) Yetkisi Ver'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
