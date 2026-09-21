import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('ahmet@saha.com');
  const [password, setPassword] = useState('123456');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Rate-limit countdown timer
  useEffect(() => {
    let interval = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password, rememberMe);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Giriş hatası:', err);
      if (err.isRateLimited) {
        const seconds = err.retryAfterSeconds || 60;
        setLockoutTimer(seconds);
        setError(`Çok fazla hatalı deneme yapıldı. Lütfen ${seconds} saniye bekleyin.`);
      } else {
        setError(err.response?.data?.message || err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/25 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Yönetici Girişi</h1>
          <p className="text-xs text-slate-400 mt-1">Saha Görev Yönetim Sistemi — Web Portalı</p>
        </div>

        {/* Error / Rate Limit Alert */}
        {error && (
          <div
            className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs mb-5 ${
              lockoutTimer > 0
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {lockoutTimer > 0 ? (
              <Clock className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">{error}</div>
              {lockoutTimer > 0 && (
                <div className="mt-1 text-[11px] font-mono">
                  Yeniden deneme süresi: <span className="font-bold text-amber-200">{lockoutTimer}s</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Yönetici E-Posta</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                disabled={lockoutTimer > 0}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@saha.com"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                disabled={lockoutTimer > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500/40 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-300 font-medium">Beni Hatırla (30 Gün)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || lockoutTimer > 0}
            className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Doğrulanıyor...</span>
              </>
            ) : lockoutTimer > 0 ? (
              <span>Geçici Kilitlendi ({lockoutTimer}s)</span>
            ) : (
              <span>Yönetici Portalı Girişi</span>
            )}
          </button>
        </form>

        {/* Demo Hint */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Varsayılan Yönetici: <span className="text-slate-400 font-mono">ahmet@saha.com / 123456</span>
          </p>
        </div>
      </div>
    </div>
  );
}
