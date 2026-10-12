'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import {
  Settings,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  Lock,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  Trash2,
  AlertCircle,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';
import { DataService } from '@/lib/services/dataService';
import { getSupabaseConfig, testSupabaseConnection } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { isOwner } = useAuth();
  const { settings, updateSettings } = useApp();

  const [appName, setAppName] = useState<string>(settings.app_name);
  const [brandOwner, setBrandOwner] = useState<string>(settings.brand_owner);
  const [logoUrl, setLogoUrl] = useState<string>(settings.logo_url);
  const [primaryColor, setPrimaryColor] = useState<string>(settings.primary_color);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Supabase Cloud State
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [cloudMessage, setCloudMessage] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [clearMessage, setClearMessage] = useState<string>('');

  useEffect(() => {
    checkCloudConnection();
  }, []);

  const checkCloudConnection = async () => {
    setCloudStatus('checking');
    const config = getSupabaseConfig();
    if (config) {
      setSupabaseUrl(config.url);
      setSupabaseKey(config.anonKey);
      const res = await testSupabaseConnection(config.url, config.anonKey);
      if (res.success) {
        setCloudStatus('connected');
        setCloudMessage(config.source === 'env' ? 'Terhubung via Environment Variables (Vercel / .env)' : 'Terhubung via Konfigurasi Langsung Browser');
      } else {
        setCloudStatus('disconnected');
        setCloudMessage(res.message);
      }
    } else {
      setCloudStatus('disconnected');
      setCloudMessage('Belum terhubung. Masih berjalan di mode memori lokal (Offline/LocalStorage).');
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl || !supabaseKey) {
      alert('Mohon isi Supabase URL dan Anon Key terlebih dahulu.');
      return;
    }

    setCloudStatus('checking');
    const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseKey.trim());
    if (res.success) {
      localStorage.setItem('mpl_custom_supabase_url', supabaseUrl.trim());
      localStorage.setItem('mpl_custom_supabase_key', supabaseKey.trim());
      setCloudStatus('connected');
      setCloudMessage('Koneksi Supabase Cloud Berhasil! Perubahan tersimpan di browser ini.');
      alert('Koneksi Supabase Cloud Berhasil! Silakan klik tombol "Unggah Data PC ke Supabase" untuk memindahkan menu dan pengaturan yang sudah Anda buat di PC ke Supabase.');
    } else {
      setCloudStatus('disconnected');
      setCloudMessage(res.message);
      alert(`Gagal koneksi: ${res.message}\nPastikan URL berawalan https:// dan Anon Key sudah benar.`);
    }
  };

  const handleSyncToSupabase = async () => {
    if (!confirm('Unggah seluruh Menu Produk, Kategori, Cabang, dan Akun dari PC ini ke Cloud Supabase sekarang?')) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await DataService.syncLocalDataToSupabase();
      setSyncStatus(res);
      if (res.success) {
        alert(res.message);
      } else {
        alert('Gagal: ' + res.message);
      }
    } catch (err: any) {
      setSyncStatus({ success: false, message: err?.message || 'Terjadi kesalahan sinkronisasi.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearDemoHistory = async () => {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA riwayat demo/transaksi lama (omzet Rp 380.000, laporan harian lama, pengeluaran kas lama)?\n\nData menu produk dan akun TIDAK akan terhapus. Aplikasi akan mulai bersih dari nol (Rp 0).')) {
      return;
    }
    setIsClearing(true);
    try {
      await DataService.clearAllDemoHistory();
      setClearMessage('Semua riwayat transaksi dan laporan dummy berhasil dibersihkan! Aplikasi kini mulai dari Rp 0.');
      alert('Semua riwayat lama berhasil dibersihkan! Silakan refresh halaman.');
      window.location.reload();
    } catch (err: any) {
      alert('Gagal membersihkan: ' + err?.message);
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="py-16 text-center space-y-3 bg-white rounded-3xl p-8 border border-slate-100 max-w-md mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500">
          Hanya Owner yang dapat mengubah identitas, koneksi database, dan pengaturan sistem.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateSettings({
        app_name: appName,
        brand_owner: brandOwner,
        logo_url: logoUrl,
        primary_color: primaryColor,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Pengaturan Brand & Database Cloud</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola identitas usaha, koneksi sinkronisasi online Supabase multi-device, dan kebersihan data</p>
        </div>
        <div>
          {cloudStatus === 'connected' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Cloud className="w-4 h-4 text-emerald-600" />
              Cloud Supabase Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <CloudOff className="w-4 h-4 text-amber-600" />
              Mode Memori Lokal (PC ini saja)
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: SUPABASE CLOUD CONNECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-extrabold text-slate-900">Sinkronisasi Database Cloud (Supabase)</h2>
            </div>
            <p className="text-xs text-slate-500">
              Menghubungkan aplikasi ke cloud PostgreSQL agar data yang disimpan di PC langsung muncul otomatis di HP kasir atau browser lain secara realtime.
            </p>
          </div>
        </div>

        {/* Status Box */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          cloudStatus === 'connected' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {cloudStatus === 'connected' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="text-xs font-extrabold">
              {cloudStatus === 'connected' ? 'Status: TERHUBUNG KE SUPABASE ONLINE' : 'Status: BELUM TERHUBUNG KE SUPABASE CLOUD'}
            </p>
            <p className="text-[11px] leading-relaxed">
              {cloudMessage}
            </p>
            {cloudStatus !== 'connected' && (
              <p className="text-[11px] font-bold text-amber-800 mt-1">
                ⚠️ Penyebab data berbeda di PC dan HP: Karena Supabase belum terhubung, data saat ini hanya tersimpan di memori browser PC ini (LocalStorage). Begitu Supabase terhubung, semua device akan 100% tersinkronkan.
              </p>
            )}
          </div>
        </div>

        {/* Input Form for Supabase Credentials */}
        <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-extrabold text-slate-800">Konfigurasi Kunci Supabase</h3>
          
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Project URL Supabase
            </label>
            <input
              type="text"
              required
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzabcdefghijklmnop.supabase.co"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-brand-700 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Anon Public Key (API Key)
            </label>
            <input
              type="text"
              required
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-brand-700 bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={cloudStatus === 'checking'}
              className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudStatus === 'checking' ? 'animate-spin' : ''}`} />
              <span>{cloudStatus === 'checking' ? 'Menguji Koneksi...' : 'Simpan & Uji Koneksi Supabase'}</span>
            </button>

            {cloudStatus === 'connected' && (
              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Mengunggah Data ke Cloud...' : 'Unggah / Sinkronkan Data PC ke Cloud Supabase'}</span>
              </button>
            )}
          </div>

          {syncStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              syncStatus.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {syncStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{syncStatus.message}</span>
            </div>
          )}
        </form>

        {/* Quick Instructions */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 text-xs text-amber-900 space-y-2">
          <p className="font-extrabold flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            Cara Sinkron Otomatis ke Vercel (Online Permanen untuk Semua HP & PC):
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 pl-1">
            <li>Buka <strong>Vercel Dashboard</strong> &rarr; pilih project <strong>misterpanconglumer</strong> &rarr; buka tab <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>.</li>
            <li>Tambahkan variable <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900">NEXT_PUBLIC_SUPABASE_URL</code> dan isi dengan URL Supabase Anda.</li>
            <li>Tambahkan variable <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dan isi dengan Anon Key Supabase Anda.</li>
            <li>Klik <strong>Redeploy</strong> di Vercel. Setelah itu, SEMUA HP dan PC kasir otomatis tersambung tanpa perlu input kunci manual!</li>
          </ol>
        </div>
      </div>

      {/* SECTION 2: PEMBERSIHAN DATA DEMO / RIWAYAT LAMA */}
      <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-extrabold text-slate-900">Bersihkan Riwayat Transaksi & Laporan Demo</h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Gunakan tombol di bawah ini untuk menghapus bersih semua riwayat dummy bawaan (misal: Laporan Cidodol Rp 380.000, pengeluaran kas dummy, transaksi test) agar sistem mulai dari angka 0 untuk operasional sebenarnya. (Daftar Menu Produk dan Akun Login tetap aman).
        </p>

        {clearMessage && (
          <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{clearMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleClearDemoHistory}
          disabled={isClearing}
          className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-98 transition-all flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>{isClearing ? 'Membersihkan Data...' : 'Bersihkan Semua Riwayat Demo Sekarang (Reset ke Rp 0)'}</span>
        </button>
      </div>

      {/* SECTION 3: IDENTITAS APLIKASI & LOGO */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900">Identitas Visual & Brand Usaha</h2>
          <p className="text-xs text-slate-500">Ubah nama usaha, logo brand, dan identitas visual owner</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nama Usaha / Aplikasi</label>
            <input
              type="text"
              required
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Mister Pancong Lumer"
              className="w-full px-3.5 py-3 border border-slate-300 rounded-2xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Brand Pengelola / Subtitle</label>
            <input
              type="text"
              required
              value={brandOwner}
              onChange={(e) => setBrandOwner(e.target.value)}
              placeholder="By Manage Nafa Family"
              className="w-full px-3.5 py-3 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">URL Logo Aplikasi</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="/logo.jpg atau URL online"
              className="w-full px-3.5 py-3 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-700"
            />
          </div>

          {/* Logo Preview */}
          {logoUrl && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <img src={logoUrl} alt="Logo Preview" className="w-12 h-12 rounded-xl object-contain bg-black border" />
              <div>
                <p className="text-xs font-bold text-slate-800">Pratinjau Logo Usaha</p>
                <p className="text-[10px] text-slate-400">Logo akan tampil di navbar, halaman login & nota cetak</p>
              </div>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan identitas aplikasi berhasil diperbarui!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-lg shadow-brand-900/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Memproses...' : 'Simpan Pengaturan Brand'}</span>
          </button>
        </form>
      </div>

    </div>
  );
}
