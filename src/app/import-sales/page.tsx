'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Branch, WhatsAppReportItem, WhatsAppExpenseItem } from '@/types';
import { ExcelImportService, ParsedExcelResult } from '@/lib/services/excelImportService';
import { formatRupiah, formatDate } from '@/lib/utils/formatters';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Store,
  Layers,
  Sparkles,
  Lock,
  RefreshCw,
  Info,
  Calendar,
  Wallet,
  FileCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function ImportSalesPage() {
  const router = useRouter();
  const { user, branches, activeBranch, isOwner, isAdminPusat } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parsing & Data States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedExcelResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Configuration States
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [applyRevisions, setApplyRevisions] = useState<boolean>(true);
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [importExpenses, setImportExpenses] = useState<boolean>(true);
  const [createSalesTransactions, setCreateSalesTransactions] = useState<boolean>(true);

  // Active Tab Preview
  const [activeTab, setActiveTab] = useState<'utama' | 'revisi' | 'pengeluaran' | 'duplikat'>('utama');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Import Execution States
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStepText, setImportStepText] = useState<string>('');
  const [importSuccessResult, setImportSuccessResult] = useState<{
    importedReports: number;
    appliedRevisions: number;
    importedExpenses: number;
    importedSales: number;
    skippedDuplicates: number;
  } | null>(null);

  // Auto-select Branch (Ulujami if available, otherwise first branch)
  useEffect(() => {
    if (branches && branches.length > 0 && !targetBranchId) {
      const ulujami = branches.find((b) => b.name.toLowerCase().includes('ulujami') || b.code === 'ULJ');
      if (ulujami) {
        setTargetBranchId(ulujami.id);
      } else if (activeBranch) {
        setTargetBranchId(activeBranch.id);
      } else {
        setTargetBranchId(branches[0].id);
      }
    }
  }, [branches, activeBranch]);

  // Role Guard
  if (!isOwner && !isAdminPusat) {
    return (
      <div className="py-16 text-center space-y-3 bg-white rounded-3xl p-8 border border-slate-100 max-w-md mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500">
          Fitur Import Laporan Penjualan hanya dapat diakses oleh Owner dan Admin Pusat.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  // Handle File Upload & Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParsedData(null);
    setImportSuccessResult(null);

    try {
      const result = await ExcelImportService.parseExcelFile(file);
      setParsedData(result);

      // Auto-set branch if hint detected
      if (result.detectedBranchHint && branches.length > 0) {
        const hint = result.detectedBranchHint.toLowerCase();
        const matched = branches.find((b) => b.name.toLowerCase().includes(hint) || b.code.toLowerCase().includes(hint));
        if (matched) {
          setTargetBranchId(matched.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to parse excel:', err);
      setParseError(err.message || 'Gagal membaca file Excel. Pastikan file berformat .xlsx yang valid.');
    } finally {
      setIsParsing(false);
    }
  };

  // One-click quick load from local sample (convenience feature for user's computer)
  const handleLoadDetectedFile = async () => {
    setIsParsing(true);
    setParseError(null);
    try {
      const res = await fetch('/api/load-local-excel');
      if (!res.ok) {
        throw new Error('File tidak ditemukan di folder lokal. Silakan pilih file manual.');
      }
      const blob = await res.blob();
      const file = new File([blob], 'Rekap_Laporan_Penjualan_Naufal_Ulujami_2025-sekarang.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      await processFile(file);
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Execute Import
  const handleStartImport = async () => {
    if (!parsedData || !user) return;
    const branchObj = branches.find((b) => b.id === targetBranchId) || activeBranch || branches[0];
    if (!branchObj) {
      alert('Pilih cabang tujuan terlebih dahulu.');
      return;
    }

    const confirmMsg =
      `Mulai impor data ke Supabase untuk Cabang ${branchObj.name}?\n\n` +
      `• Total Laporan Utama: ${parsedData.summary.totalUtama} hari\n` +
      `• Revisi Nasrullah: ${parsedData.summary.totalRevisi} revisi\n` +
      `• Rincian Pengeluaran: ${parsedData.summary.totalPengeluaran} baris\n\n` +
      `Data yang duplikat akan disaring dan revisi akan disesuaikan secara otomatis.`;

    if (!window.confirm(confirmMsg)) return;

    setIsImporting(true);
    setImportProgress(5);
    setImportStepText('Menghubungkan ke Supabase...');

    try {
      const result = await ExcelImportService.importToSupabase({
        reports: parsedData.laporanUtama,
        expenses: parsedData.rincianPengeluaran,
        targetBranch: branchObj,
        userId: user.id,
        userName: user.full_name,
        applyRevisions,
        skipDuplicates,
        importExpenses,
        createSalesTransactions,
        onProgress: (pct, step) => {
          setImportProgress(pct);
          setImportStepText(step);
        },
      });

      setImportSuccessResult({
        importedReports: result.importedReportsCount,
        appliedRevisions: result.appliedRevisionsCount,
        importedExpenses: result.importedExpensesCount,
        importedSales: result.importedSalesCount,
        skippedDuplicates: result.skippedDuplicatesCount,
      });
    } catch (err: any) {
      console.error('Import failed:', err);
      alert('Gagal mengimpor data ke Supabase: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered views for tabs
  const filteredUtama = parsedData
    ? parsedData.laporanUtama.filter((r) => {
        const matchSearch =
          r.tanggal_laporan.includes(searchQuery) ||
          r.pengirim.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.terjual_teks && r.terjual_teks.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchMonth = filterMonth === 'all' || r.tanggal_laporan.startsWith(filterMonth);
        return matchSearch && matchMonth;
      })
    : [];

  const filteredExpenses = parsedData
    ? parsedData.rincianPengeluaran.filter((e) => {
        const matchSearch =
          e.tanggal_laporan.includes(searchQuery) ||
          e.rincian.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.category_name && e.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchMonth = filterMonth === 'all' || e.tanggal_laporan.startsWith(filterMonth);
        return matchSearch && matchMonth;
      })
    : [];

  // Month options for filter dropdown
  const monthOptions = parsedData
    ? Array.from(new Set(parsedData.laporanUtama.map((r) => r.tanggal_laporan.slice(0, 7)).filter(Boolean))).sort()
    : [];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#3d1e0f] via-[#522b17] to-amber-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">
              Modul Integrasi Data
            </span>
            <span className="text-xs text-amber-200/70">• Excel WhatsApp Importer</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Import Laporan Penjualan WhatsApp</h1>
          <p className="text-xs text-amber-200 mt-1 max-w-xl">
            Unggah file rekapan Excel laporan kas harian & pengeluaran WhatsApp untuk disimpan langsung ke Supabase Cloud.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/daily-reports"
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#3d1e0f] font-black text-xs transition-colors shadow-sm"
          >
            Laporan Harian
          </Link>
        </div>
      </div>

      {/* STEP 1: Upload Card */}
      <div className="bg-white p-6 rounded-3xl border border-amber-900/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-amber-600" />
              <span>1. Pilih File Excel Laporan (.xlsx)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Membaca sheet <b>Laporan_Utama</b>, <b>Revisi_Nasrullah</b>, <b>Rincian_Pengeluaran</b>, dan <b>Semua_Laporan_2025+</b>
            </p>
          </div>

          {/* Local auto-load shortcut */}
          <button
            onClick={handleLoadDetectedFile}
            disabled={isParsing}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#3d1e0f] border border-amber-200 text-xs font-extrabold flex items-center gap-1.5 transition-colors shrink-0"
            title="Muat otomatis file rekap Naufal Ulujami dari folder Mutasi"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Muat Rekap WhatsApp Ulujami</span>
          </button>
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
            selectedFile
              ? 'border-emerald-500 bg-emerald-50/40'
              : 'border-slate-300 hover:border-amber-600 hover:bg-amber-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-extrabold text-slate-800">
                {selectedFile ? selectedFile.name : 'Sentuh atau Seret File Excel (.xlsx) ke Sini'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedFile
                  ? `Ukuran file: ${(selectedFile.size / 1024).toFixed(1)} KB`
                  : 'Kompatibel dengan file Rekap Laporan Penjualan WhatsApp dari HP atau Komputer'}
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-[#3d1e0f] text-amber-100 font-extrabold text-xs shadow-md"
            >
              Pilih File dari Perangkat
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isParsing && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">Membaca dan memverifikasi seluruh sheet Excel...</p>
          </div>
        )}

        {/* Error Message */}
        {parseError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal Memproses Excel:</p>
              <p className="mt-0.5">{parseError}</p>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: Preview & Validation (Requirements 4, 5, 6, 8) */}
      {parsedData && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Summary Indicator Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Laporan Utama</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{parsedData.summary.totalUtama}</p>
              <p className="text-[11px] text-slate-500 font-medium">Periode {parsedData.summary.dateRange.start} s/d {parsedData.summary.dateRange.end}</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-200 bg-amber-50/40 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Revisi Nasrullah</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                  Koreksi
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-900">{parsedData.summary.totalRevisi} Hari</p>
              <p className="text-[11px] text-amber-700 font-medium">Dicocokkan otomatis ke laporan utama</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rincian Pengeluaran</span>
              <p className="text-xl sm:text-2xl font-black text-rose-600">{parsedData.summary.totalPengeluaran}</p>
              <p className="text-[11px] text-slate-500 font-medium">Total: {formatRupiah(parsedData.summary.totalPengeluaranRp)}</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-rose-200 bg-rose-50/30 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Duplikasi Terdeteksi</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black">
                  Perlu Cek
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-700">{parsedData.summary.duplicateCount} Tanggal</p>
              <p className="text-[11px] text-rose-600 font-medium">Disaring & tidak dihitung dobel</p>
            </div>

          </div>

          {/* Financial Breakdown Alert (Requirement 8) */}
          <div className="bg-white p-5 rounded-3xl border border-amber-900/10 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-black text-sm text-slate-900">Validasi & Rekapitulasi Angka Keuangan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sesuai ketentuan pembukuan, <b>data duplikat & data berstatus &quot;Perlu verifikasi&quot; dipisahkan secara ketat</b> dan tidak langsung digabungkan ke omzet final sampai diverifikasi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Omzet Terverifikasi (Aman)</span>
                <p className="text-base font-black text-emerald-900">{formatRupiah(parsedData.summary.verifiedOmzet)}</p>
                <p className="text-[10px] text-emerald-700">Data valid tanpa duplikat/perlu verifikasi</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-800">Omzet Menunggu Verifikasi</span>
                <p className="text-base font-black text-amber-900">{formatRupiah(parsedData.summary.unverifiedOmzet)}</p>
                <p className="text-[10px] text-amber-700">{parsedData.summary.unverifiedCount} hari berstatus perlu verifikasi</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-600">Total Pengeluaran Cabang</span>
                <p className="text-base font-black text-rose-700">{formatRupiah(parsedData.summary.totalPengeluaranRp)}</p>
                <p className="text-[10px] text-slate-500">Dari 2.350 baris sheet Rincian_Pengeluaran</p>
              </div>
            </div>
          </div>

          {/* Multi-Tab Preview Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-5">
            
            {/* Tabs Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveTab('utama')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'utama'
                      ? 'bg-[#3d1e0f] text-amber-200 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Laporan Utama ({parsedData.laporanUtama.length})
                </button>

                <button
                  onClick={() => setActiveTab('revisi')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'revisi'
                      ? 'bg-[#3d1e0f] text-amber-200 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Revisi Nasrullah ({parsedData.revisiNasrullah.length})
                </button>

                <button
                  onClick={() => setActiveTab('pengeluaran')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'pengeluaran'
                      ? 'bg-[#3d1e0f] text-amber-200 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Rincian Pengeluaran ({parsedData.rincianPengeluaran.length})
                </button>

                <button
                  onClick={() => setActiveTab('duplikat')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'duplikat'
                      ? 'bg-[#3d1e0f] text-amber-200 shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Duplikasi ({parsedData.duplicatesList.length})
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari tanggal / pengirim..."
                    className="pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                {monthOptions.length > 0 && (
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50"
                  >
                    <option value="all">Semua Bulan</option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* TAB 1: Laporan Utama */}
            {activeTab === 'utama' && (
              <div className="space-y-2">
                <div className="overflow-x-auto max-h-[460px] border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#3d1e0f] text-amber-100 font-extrabold uppercase text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="p-2.5">Tanggal Laporan</th>
                        <th className="p-2.5">Pengirim</th>
                        <th className="p-2.5 text-right">Omzet (Rp)</th>
                        <th className="p-2.5 text-right">Pengeluaran</th>
                        <th className="p-2.5 text-right">Saldo Cash</th>
                        <th className="p-2.5">Porsi Terjual</th>
                        <th className="p-2.5">Status & Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUtama.slice(0, 100).map((r, idx) => (
                        <tr key={idx} className={`hover:bg-amber-50/50 transition-colors ${r.is_duplicate ? 'bg-rose-50/40' : ''}`}>
                          <td className="p-2.5 font-bold text-slate-900 font-mono whitespace-nowrap">
                            {r.tanggal_laporan}
                            {r.is_duplicate && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800">
                                Duplikat
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap">{r.pengirim}</td>
                          <td className="p-2.5 font-black text-right text-slate-900 font-mono">
                            {formatRupiah(r.omzet_rp)}
                            {r.is_revision && (
                              <span className="block text-[10px] text-amber-700 font-bold">
                                (Revisi Nasrullah)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right text-rose-600 font-bold font-mono">
                            {formatRupiah(r.pengeluaran_total_rp)}
                          </td>
                          <td className="p-2.5 text-right text-emerald-700 font-bold font-mono">
                            {formatRupiah(r.saldo_cash_rp)}
                          </td>
                          <td className="p-2.5 text-slate-600">{r.terjual_teks || '-'}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.is_revision
                                  ? 'bg-amber-100 text-amber-900 font-black'
                                  : r.status_verifikasi.toLowerCase().includes('perlu')
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.status_verifikasi}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400">
                  Menampilkan {Math.min(100, filteredUtama.length)} dari {filteredUtama.length} baris laporan utama.
                </p>
              </div>
            )}

            {/* TAB 2: Revisi Nasrullah (Requirement 5) */}
            {activeTab === 'revisi' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Prinsip Penanganan Revisi Nasrullah:</span>
                  </p>
                  <p className="text-amber-800">
                    Pesan Nasrullah bukan laporan penjualan baru, melainkan koreksi resmi atas data kasir pada tanggal tersebut.
                    Saat diimpor, angka omzet/pengeluaran revisi akan langsung memperbarui laporan pada tanggal terkait dan diberi label <b>&quot;Revisi Nasrullah&quot;</b>.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#3d1e0f] text-amber-100 font-extrabold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Pengirim</th>
                        <th className="p-2.5 text-right">Omzet Revisi</th>
                        <th className="p-2.5 text-right">Pengeluaran</th>
                        <th className="p-2.5 text-right">Saldo Cash</th>
                        <th className="p-2.5">Porsi Terjual</th>
                        <th className="p-2.5">Status Pencocokan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.revisiNasrullah.map((rev, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/50">
                          <td className="p-2.5 font-bold text-slate-900 font-mono">{rev.tanggal_laporan}</td>
                          <td className="p-2.5 font-bold text-amber-900">{rev.pengirim}</td>
                          <td className="p-2.5 font-black text-right text-[#3d1e0f] font-mono">
                            {formatRupiah(rev.omzet_rp)}
                          </td>
                          <td className="p-2.5 text-right text-rose-600 font-bold font-mono">
                            {formatRupiah(rev.pengeluaran_total_rp)}
                          </td>
                          <td className="p-2.5 text-right text-emerald-700 font-bold font-mono">
                            {formatRupiah(rev.saldo_cash_rp)}
                          </td>
                          <td className="p-2.5 text-slate-600">{rev.terjual_teks || '-'}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                              Tercocokkan ke Laporan Utama
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: Rincian Pengeluaran */}
            {activeTab === 'pengeluaran' && (
              <div className="space-y-2">
                <div className="overflow-x-auto max-h-[460px] border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#3d1e0f] text-amber-100 font-extrabold uppercase text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Rincian Pengeluaran</th>
                        <th className="p-2.5">Kategori Terpetakan</th>
                        <th className="p-2.5 text-right">Nominal (Rp)</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.slice(0, 100).map((e, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900 font-mono whitespace-nowrap">{e.tanggal_laporan}</td>
                          <td className="p-2.5 font-medium text-slate-800">{e.rincian}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200/60">
                              {e.category_name}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-black text-rose-600 font-mono whitespace-nowrap">
                            {formatRupiah(e.nominal_rp)}
                          </td>
                          <td className="p-2.5 text-[10px] text-slate-500">{e.status_verifikasi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-400">
                  Menampilkan {Math.min(100, filteredExpenses.length)} dari {filteredExpenses.length} rincian pengeluaran.
                </p>
              </div>
            )}

            {/* TAB 4: Duplikasi Terdeteksi (Requirement 6 & 8) */}
            {activeTab === 'duplikat' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Daftar Tanggal yang Memiliki Laporan Ganda:</span>
                  </p>
                  <p className="text-rose-800">
                    Sistem mendeteksi tanggal laporan yang muncul lebih dari satu kali (misalnya pesan chat tahun 2026 yang tertulis 2025).
                    Secara default, <b>hanya 1 entri utama yang akan disimpan</b> agar omzet tidak berlipat ganda.
                  </p>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {parsedData.duplicatesList.map((dup, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-black text-sm text-slate-900 font-mono">
                          Tanggal Laporan: {dup.date} ({dup.items.length} entri ditemukan)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          Perlu Resolusi
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {dup.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className={`p-3 rounded-xl border ${
                              itemIdx === 0
                                ? 'bg-white border-emerald-300 shadow-xs'
                                : 'bg-slate-100 border-slate-300 opacity-80'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                              <span>Entri #{itemIdx + 1} (Chat: {item.tanggal_chat} {item.waktu_chat})</span>
                              {itemIdx === 0 ? (
                                <span className="text-emerald-700 font-black">✓ Rekomendasi Disimpan</span>
                              ) : (
                                <span className="text-slate-500">Dilewati</span>
                              )}
                            </div>
                            <p className="font-black text-slate-900 text-sm">Omzet: {formatRupiah(item.omzet_rp)}</p>
                            <p className="text-[11px] text-slate-600">Pengeluaran: {formatRupiah(item.pengeluaran_total_rp)} | Cash: {formatRupiah(item.saldo_cash_rp)}</p>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 italic">{item.isi_laporan_lengkap}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* STEP 3: Import Configuration & CTA (Requirements 7, 9, 10) */}
          <div className="bg-white p-6 rounded-3xl border border-amber-900/10 shadow-sm space-y-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>2. Konfirmasi & Pengaturan Simpan ke Supabase Cloud</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Branch Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Cabang Tujuan Impor:</label>
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 bg-white shadow-xs"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Cabang {b.name} ({b.code}) {b.name.toLowerCase().includes('ulujami') ? '— [Rekomendasi Excel]' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Data laporan dan pengeluaran akan otomatis dikaitkan dengan cabang ini.
                </p>
              </div>

              {/* Options Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyRevisions}
                    onChange={(e) => setApplyRevisions(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3d1e0f] focus:ring-amber-500"
                  />
                  <span>Terapkan revisi Nasrullah otomatis ke laporan utama terkait</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3d1e0f] focus:ring-amber-500"
                  />
                  <span>Saring duplikat otomatis (hanya simpan 1 entri per tanggal)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importExpenses}
                    onChange={(e) => setImportExpenses(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3d1e0f] focus:ring-amber-500"
                  />
                  <span>Simpan 2.350 rincian pengeluaran ke tabel Pengeluaran Cabang</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createSalesTransactions}
                    onChange={(e) => setCreateSalesTransactions(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3d1e0f] focus:ring-amber-500"
                  />
                  <span>Sinkronkan ke ringkasan transaksi penjualan Dashboard</span>
                </label>
              </div>

            </div>

            {/* Impor CTA Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Data akan langsung disimpan permanen di database <b>Supabase Cloud</b>.
              </div>

              <button
                onClick={handleStartImport}
                disabled={isImporting}
                className="py-3.5 px-8 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-black text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Mengimpor ke Supabase...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Mulai Impor ke Supabase ({parsedData.summary.totalUtama} Laporan)</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Progress Modal */}
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-amber-950/10">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#3d1e0f] flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Menyimpan ke Supabase Cloud</h3>
              <p className="text-xs text-slate-500">{importStepText}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-[#3d1e0f] h-full rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>

            <p className="text-xs font-mono font-bold text-slate-700">{importProgress}% Selesai</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {importSuccessResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-emerald-500/20">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Impor Berhasil Disimpan!</h3>
              <p className="text-xs text-slate-500">
                Seluruh data laporan penjualan WhatsApp telah tersimpan aman di database Supabase Cloud.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Laporan Harian Tersimpan:</span>
                <span className="font-bold text-slate-900 font-mono">{importSuccessResult.importedReports} hari</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Revisi Nasrullah Diterapkan:</span>
                <span className="font-bold text-amber-900 font-mono">{importSuccessResult.appliedRevisions} revisi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rincian Pengeluaran Diimpor:</span>
                <span className="font-bold text-rose-600 font-mono">{importSuccessResult.importedExpenses} pengeluaran</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaksi Dashboard Terhubung:</span>
                <span className="font-bold text-emerald-700 font-mono">{importSuccessResult.importedSales} TRX</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duplikat Dieliminasi:</span>
                <span className="font-bold text-slate-500 font-mono">{importSuccessResult.skippedDuplicates} baris</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href="/dashboard"
                className="py-3 px-4 rounded-xl bg-[#3d1e0f] text-amber-100 font-black text-xs hover:bg-amber-950 transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Lihat Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/daily-reports"
                className="py-3 px-4 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center"
              >
                Laporan Harian
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
