'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials } = useAuth();
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
      setErrorMsg(res.message || 'Username atau password yang Anda masukkan salah!');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Production Clean Brand Header */}
        <div className="bg-[#3d1e0f] text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Official Brand Logo */}
          <div className="w-24 h-24 rounded-2xl bg-black border-2 border-amber-500/40 p-1 mx-auto mb-4 shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src={settings.logo_url || '/logo.jpg'}
              alt="Logo Mister Pancong"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                e.currentTarget.src = '/logo.jpg';
              }}
            />
          </div>

          <h2 className="text-xl font-black tracking-tight">{settings.app_name}</h2>
          <p className="text-xs text-amber-300 font-bold mt-1">{settings.brand_owner}</p>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Username / Email Karyawan</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kata Sandi (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun"
                  className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-black text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Memeriksa Kredensial...' : 'Masuk Aplikasi'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </form>

          {/* Secure Production Footer Note */}
          <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-medium">
            <p>Sistem Terintegrasi Kasir, Absensi, Laporan & Penggajian</p>
            <p className="text-slate-500 font-bold mt-0.5">© Mister Pancong Lumer • By Manage Nafa Family</p>
          </div>

        </div>

      </div>
    </div>
  );
}
