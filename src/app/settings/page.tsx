'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Settings, Image as ImageIcon, Save, CheckCircle2, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { isOwner } = useAuth();
  const { settings, updateSettings } = useApp();

  const [appName, setAppName] = useState<string>(settings.app_name);
  const [brandOwner, setBrandOwner] = useState<string>(settings.brand_owner);
  const [logoUrl, setLogoUrl] = useState<string>(settings.logo_url);
  const [primaryColor, setPrimaryColor] = useState<string>(settings.primary_color);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOwner) {
    return (
      <div className="py-16 text-center space-y-3 bg-white rounded-3xl p-8 border border-slate-100 max-w-md mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500">
          Hanya Owner yang dapat mengubah identitas dan nama aplikasi.
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
    <div className="space-y-6 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Pengaturan Identitas Aplikasi</h1>
        <p className="text-xs text-slate-500 mt-0.5">Ubah nama usaha, logo brand, dan identitas visual owner tanpa merubah kode</p>
      </div>

      {/* Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
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
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-3 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-700"
            />
          </div>

          {/* Logo Preview */}
          {logoUrl && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <img src={logoUrl} alt="Logo Preview" className="w-12 h-12 rounded-xl object-cover border" />
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
