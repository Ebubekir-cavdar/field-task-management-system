import React from 'react';
import { Menu, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & title OR Desktop greeting */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Menüyü Aç"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo (Visible only on mobile/tablet) */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Saha Admin</span>
        </div>

        {/* Desktop Greeting (Hidden on mobile) */}
        <div className="hidden lg:block">
          <span className="text-xs font-semibold text-slate-400">
            Saha Operasyonları Yönetim Portalı
          </span>
        </div>
      </div>

      {/* Right: User Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* User Card */}
        <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            {user?.name?.[0] || <User className="w-4 h-4" />}
          </div>
          <div className="text-left text-xs">
            <div className="font-semibold text-slate-200 leading-tight">{user?.name} {user?.surname}</div>
            <div className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">
              {user?.role || 'Yönetici'}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors flex items-center gap-1.5 text-xs font-medium"
          title="Güvenli Çıkış Yap"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
    </header>
  );
}
