import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Users, PlusCircle, X, ShieldCheck } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, onOpenCreateModal }) {
  const location = useLocation();

  const navItems = [
    { name: 'Genel Bakış (Dashboard)', path: '/', icon: LayoutDashboard },
    { name: 'Görev Yönetimi', path: '/tasks', icon: CheckSquare },
    { name: 'Personel & Roller', path: '/users', icon: Users },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container (Fixed on desktop, drawer on mobile) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 sm:px-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-xs text-white leading-tight">Saha Görev</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Yönetici Paneli</div>
            </div>
          </div>

          {/* Close button only on mobile/tablet drawer */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            title="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action: Create Task Button */}
        <div className="p-4">
          <button
            onClick={() => {
              if (onClose) onClose();
              if (onOpenCreateModal) onOpenCreateModal();
            }}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yeni Görev Ata</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (onClose) onClose();
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom System Status Badge */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-300">Sistem Çevrimiçi</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">API: Port 5000 | PostgreSQL</p>
          </div>
        </div>
      </aside>
    </>
  );
}
