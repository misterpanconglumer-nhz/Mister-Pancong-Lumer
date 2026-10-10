'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Lock, User, ArrowRight, Sparkles, Store, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials, loginAsDemoUser } = useAuth();
  const { settings } = useApp();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password.trim()) {
      setErrorMsg('Masukkan username/email dan password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await loginWithCredentials(usernameOrEmail, password);
    setIsSubmitting(false);

    if (res.success) {
      router.push('/pos');
    } else {
      setErrorMsg(res.message || 'Login gagal.');
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    await loginAsDemoUser(role);
    if (role === 'owner') {
      router.push('/dashboard');
    } else {
      router.push('/pos');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-brand-900 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-amber-500 p-1 mx-auto mb-3 shadow-xl flex items-center justify-center font-bold text-brand-900 text-2xl">
            {settings.logo_url && !settings.logo_url.includes('placeholder') ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span>PL</span>
            )}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">{settings.app_name}</h2>
          <p className="text-xs text-amber-300 font-semibold mt-0.5">{settings.brand_owner}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Username / Email Karyawan</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Username (contoh: kasircdd / owner)"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kata Sandi (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-lg shadow-brand-900/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Memeriksa Account...' : 'Masuk Aplikasi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Info & Demo Roles */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Simulasi Login Cepat (Atau Gunakan Username):</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 font-medium space-y-1">
              <p className="font-bold text-brand-900">Akun Bawaan (Username & Password ditentukan Owner):</p>
              <ul className="space-y-0.5 font-mono text-[10px] text-slate-700">
                <li>• Owner: Username <strong className="text-brand-900">owner</strong> | Pass: <strong>123</strong></li>
                <li>• Admin Pusat: Username <strong className="text-brand-900">adminpusat</strong> | Pass: <strong>123</strong></li>
                <li>• Admin Cidodol: Username <strong className="text-brand-900">admincdd</strong> | Pass: <strong>123</strong></li>
                <li>• Penjual Cidodol: Username <strong className="text-brand-900">kasircdd</strong> | Pass: <strong>123</strong></li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDemoLogin('owner')}
                className="p-2.5 rounded-xl border border-amber-300 bg-amber-100 hover:bg-amber-200 text-left font-bold text-amber-900 text-xs flex items-center justify-between"
              >
                <span>👑 Owner</span>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              </button>

              <button
                onClick={() => handleDemoLogin('penjual')}
                className="p-2.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-left font-bold text-brand-900 text-xs flex items-center justify-between"
              >
                <span>🛒 Kasir (Penjual)</span>
                <Store className="w-3.5 h-3.5 text-brand-700" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
