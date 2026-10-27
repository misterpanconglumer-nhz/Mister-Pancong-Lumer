'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DailyReport, SaleTransaction, Expense, UserProfile } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDate, formatDateTime, formatTimeOnly } from '@/lib/utils/formatters';
import {
  ClipboardList,
  Plus,
  Printer,
  Calendar,
  Store,
  Trash2,
  FileSpreadsheet,
  User,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Clock,
  X,
  Receipt,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function DailyReportsPage() {
  const { user, activeBranch, branches, isOwner, isAdminPusat, isAdminCabang } = useAuth();
  const { settings } = useApp();

  const isEmployee = !isOwner && !isAdminPusat;

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Raw data cache for fast filtering and recalculation
  const [rawSales, setRawSales] = useState<SaleTransaction[]>([]);
  const [rawExpenses, setRawExpenses] = useState<Expense[]>([]);

  // Navigation tab for Owner
  const [ownerMainTab, setOwnerMainTab] = useState<'shift_checker' | 'closing_archive'>('shift_checker');

  // Active view tab for transactions detail
  const [activeDetailTab, setActiveDetailTab] = useState<'sales' | 'expenses' | 'closing'>('sales');

  // Parameter Filter: Hari / Bulan / Cabang / Karyawan
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [filterBranchId, setFilterBranchId] = useState<string>(isEmployee ? (activeBranch?.id || 'all') : 'all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>(isEmployee ? (user?.id || 'all') : 'all');

  // Modals
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [showSlipModal, setShowSlipModal] = useState<boolean>(false);

  // Form states for closing cash shift modal
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportBranchId, setReportBranchId] = useState<string>('');
  const [initialCashInput, setInitialCashInput] = useState<number>(100000);
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load all necessary data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rList, sList, eList, uList] = await Promise.all([
        DataService.getDailyReports(),
        DataService.getSales(),
        DataService.getExpenses(),
        DataService.getUsers(),
      ]);
      setReports(rList);
      setRawSales(sList);
      setRawExpenses(eList);
      setUsersList(uList);
    } catch (err) {
      console.error('Error fetching daily report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBranch]);

  // Keep branch & user defaults in sync if role is employee
  useEffect(() => {
    if (isEmployee) {
      if (activeBranch?.id) setFilterBranchId(activeBranch.id);
      if (user?.id) setFilterEmployeeId(user.id);
    }
  }, [isEmployee, activeBranch, user]);

  // Determine current effective employee target
  const targetEmployeeObj = useMemo(() => {
    if (filterEmployeeId === 'all') return null;
    return usersList.find((u) => u.id === filterEmployeeId) || (user?.id === filterEmployeeId ? user : null);
  }, [filterEmployeeId, usersList, user]);

  // Target branch object
  const currentBranchObj = useMemo(() => {
    if (filterBranchId === 'all') return activeBranch || branches[0] || null;
    return branches.find((b) => b.id === filterBranchId) || activeBranch;
  }, [filterBranchId, branches, activeBranch]);

  // Filtered Sales Transactions based on Date, Branch, and Employee
  const filteredSales = useMemo(() => {
    return rawSales.filter((s) => {
      // Must be completed
      if (s.status !== 'completed') return false;

      // Filter by Date or Month
      if (filterMode === 'date') {
        if (filterDate && !s.created_at.startsWith(filterDate)) return false;
      } else {
        if (filterMonth && !s.created_at.startsWith(filterMonth)) return false;
      }

      // Filter by Branch
      if (filterBranchId !== 'all' && s.branch_id && s.branch_id !== filterBranchId) {
        return false;
      }

      // Filter by Employee / Seller
      if (filterEmployeeId !== 'all') {
        const empName = targetEmployeeObj?.full_name?.toLowerCase().trim() || user?.full_name?.toLowerCase().trim() || '';
        const sellerName = (s.seller_name || '').toLowerCase().trim();

        const matchId = s.seller_id === filterEmployeeId;
        const matchName = empName && sellerName && (sellerName.includes(empName) || empName.includes(sellerName));
        const matchBranchFallback = !s.seller_id && !s.seller_name && isEmployee && s.branch_id === activeBranch?.id;

        if (!matchId && !matchName && !matchBranchFallback) {
          return false;
        }
      }

      return true;
    });
  }, [rawSales, filterMode, filterDate, filterMonth, filterBranchId, filterEmployeeId, targetEmployeeObj, user, isEmployee, activeBranch]);

  // Filtered Expenses based on Date, Branch, and Employee
  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter((e) => {
      // Ignore rejected expenses
      if (e.status === 'rejected') return false;

      // Filter by Date or Month
      if (filterMode === 'date') {
        if (filterDate && e.expense_date !== filterDate) return false;
      } else {
        if (filterMonth && !e.expense_date?.startsWith(filterMonth)) return false;
      }

      // Filter by Branch
      if (filterBranchId !== 'all' && e.branch_id && e.branch_id !== filterBranchId) {
        return false;
      }

      // Filter by Employee / Creator
      if (filterEmployeeId !== 'all') {
        const empName = targetEmployeeObj?.full_name?.toLowerCase().trim() || user?.full_name?.toLowerCase().trim() || '';
        const creatorName = (e.created_by_name || '').toLowerCase().trim();

        const matchId = e.created_by === filterEmployeeId;
        const matchName = empName && creatorName && (creatorName.includes(empName) || empName.includes(creatorName));
        const matchBranchFallback = !e.created_by && !e.created_by_name && isEmployee && e.branch_id === activeBranch?.id;

        if (!matchId && !matchName && !matchBranchFallback) {
          return false;
        }
      }

      return true;
    });
  }, [rawExpenses, filterMode, filterDate, filterMonth, filterBranchId, filterEmployeeId, targetEmployeeObj, user, isEmployee, activeBranch]);

  // Aggregated Metrics for the current view
  const shiftMetrics = useMemo(() => {
    const grossSales = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
    const cashSales = filteredSales
      .filter((s) => s.payment_method === 'tunai')
      .reduce((sum, s) => sum + s.total_amount, 0);
    const nonCashSales = filteredSales
      .filter((s) => s.payment_method !== 'tunai')
      .reduce((sum, s) => sum + s.total_amount, 0);
    const totalTransactions = filteredSales.length;

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const branchCashExpenses = filteredExpenses
      .filter((e) => e.payment_method === 'kas_cabang')
      .reduce((sum, e) => sum + e.amount, 0);
    const personalExpenses = filteredExpenses
      .filter((e) => e.payment_method === 'uang_pribadi')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpenseItems = filteredExpenses.length;

    const defaultInitialCash = currentBranchObj?.initial_cash_default ?? 100000;
    const expectedDrawerCash = defaultInitialCash + cashSales - branchCashExpenses;
    const netTurnover = grossSales - totalExpenses;

    return {
      grossSales,
      cashSales,
      nonCashSales,
      totalTransactions,
      totalExpenses,
      branchCashExpenses,
      personalExpenses,
      totalExpenseItems,
      defaultInitialCash,
      expectedDrawerCash,
      netTurnover,
    };
  }, [filteredSales, filteredExpenses, currentBranchObj]);

  // Filtered closing reports (Arsip Tutup Kas)
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filterBranchId !== 'all' && r.branch_id !== filterBranchId) return false;
      if (filterMode === 'date') {
        if (filterDate && r.report_date !== filterDate) return false;
      } else {
        if (filterMonth && !r.report_date.startsWith(filterMonth)) return false;
      }
      return true;
    });
  }, [reports, filterBranchId, filterMode, filterDate, filterMonth]);

  // Open Tutup Kas modal
  const handleOpenTutupKasModal = () => {
    const targetDate = filterMode === 'date' && filterDate ? filterDate : new Date().toISOString().split('T')[0];
    const targetBranch = filterBranchId !== 'all' ? filterBranchId : (activeBranch?.id || branches[0]?.id || 'd9ec11ac-c42f-4904-b932-20abbe83e89e');

    setReportDate(targetDate);
    setReportBranchId(targetBranch);
    setInitialCashInput(currentBranchObj?.initial_cash_default || 100000);
    setActualCashInput('');
    setReportNotes('');
    setShowFormModal(true);
  };

  // Submit Tutup Kas Form
  const handleSubmitClosingReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const targetBranchObj = branches.find((b) => b.id === reportBranchId) || activeBranch;
    const actualCashNum = Number(actualCashInput) || 0;
    const expectedCash = initialCashInput + shiftMetrics.cashSales - shiftMetrics.branchCashExpenses;
    const cashDiff = actualCashNum - expectedCash;

    setIsSubmitting(true);
    try {
      const saved = await DataService.submitDailyReport({
        branch_id: reportBranchId,
        branch_name: targetBranchObj?.name || 'Cabang',
        report_date: reportDate,
        submitted_by: user.id,
        submitted_by_name: user.full_name,
        gross_sales: shiftMetrics.grossSales,
        total_transactions: shiftMetrics.totalTransactions,
        cash_sales: shiftMetrics.cashSales,
        non_cash_sales: shiftMetrics.nonCashSales,
        branch_cash_expenses: shiftMetrics.branchCashExpenses,
        initial_cash_balance: initialCashInput,
        expected_cash: expectedCash,
        actual_cash: actualCashNum,
        cash_difference: cashDiff,
        notes: reportNotes,
        status: isOwner ? 'approved' : 'pending',
      });

      setReports((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      setShowFormModal(false);
      alert('✓ Laporan Tutup Kas Harian berhasil disimpan!');
      await fetchData();
    } catch (err: any) {
      console.error('Failed to submit daily report:', err);
      alert('Gagal mengirim laporan: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReport = async (reportId: string, date: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus Laporan Tutup Kas tanggal ${formatDate(date)}?`)) {
      try {
        await DataService.deleteDailyReport(reportId);
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        alert('✓ Laporan harian berhasil dihapus!');
        await fetchData();
      } catch (err: any) {
        alert('Gagal menghapus laporan: ' + (err?.message || 'Terjadi kendala'));
      }
    }
  };

  const handleReviewReport = async (reportId: string, status: 'approved' | 'revision_requested') => {
    if (!user) return;
    await DataService.updateDailyReportStatus(reportId, status, user.id);
    await fetchData();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-100 text-[#3d1e0f]">
              <ClipboardList className="w-5 h-5 stroke-[2.5]" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {isEmployee ? 'Laporan Shift & Transaksi Saya' : 'Laporan Harian & Shift Kasir'}
              </h1>
              <p className="text-xs text-slate-500">
                {isEmployee
                  ? `Rekapitulasi pemasukan penjualan dan pengeluaran belanja yang Anda transaksikan.`
                  : `Cek detail pemasukan, pengeluaran kasir per karyawan, dan arsip tutup kas harian.`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(isOwner || isAdminPusat) && (
            <Link
              href="/import-sales"
              className="py-2.5 px-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[#3d1e0f] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import Excel WA</span>
            </Link>
          )}

          <button
            onClick={() => setShowSlipModal(true)}
            className="py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            title="Cetak Struk Rekapitulasi Kasir (Ukuran Thermal)"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>Cetak Struk Rekap</span>
          </button>

          <button
            onClick={handleOpenTutupKasModal}
            className="py-2.5 px-4 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-md shadow-[#3d1e0f]/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tutup Kas Shift</span>
          </button>
        </div>
      </div>

      {/* Owner Mode Switcher: Rekap Shift Transaksi vs Arsip Tutup Kas */}
      {(isOwner || isAdminPusat) && (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md print:hidden">
          <button
            onClick={() => setOwnerMainTab('shift_checker')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              ownerMainTab === 'shift_checker'
                ? 'bg-white text-[#3d1e0f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-amber-700" />
            <span>Rekap Shift Transaksi Kasir</span>
          </button>
          <button
            onClick={() => setOwnerMainTab('closing_archive')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              ownerMainTab === 'closing_archive'
                ? 'bg-white text-[#3d1e0f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BadgeCheck className="w-4 h-4 text-emerald-700" />
            <span>Arsip Tutup Kas Cabang ({reports.length})</span>
          </button>
        </div>
      )}

      {/* Parameter Filter Bar: Tanggal / Bulan / Cabang / Karyawan */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3.5 print:hidden">
        
        {/* Top Filter Row: Presets & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Mode Switcher: Tanggal vs Bulan */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setFilterMode('date')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'date'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Filter Harian
            </button>
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'month'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Filter Bulanan
            </button>
          </div>

          {/* Controls for Owner: Branch & Employee Picker */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Branch Selector */}
            {(isOwner || isAdminPusat) ? (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Store className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">Semua Cabang</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Cabang {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900">
                <Store className="w-3.5 h-3.5 text-amber-700" />
                <span>Cabang: {activeBranch?.name || 'Cabang Saya'}</span>
              </div>
            )}

            {/* Employee Selector */}
            {(isOwner || isAdminPusat) ? (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">Semua Karyawan</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-900">
                <User className="w-3.5 h-3.5 text-blue-700" />
                <span>Kasir: {user?.full_name || 'Saya'}</span>
              </div>
            )}

          </div>
        </div>

        {/* Date Inputs & Quick Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {filterMode === 'date' ? (
            <>
              <div className="relative min-w-[150px]">
                <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                />
              </div>

              {/* Preset Button: Hari Ini */}
              <button
                onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  filterDate === new Date().toISOString().split('T')[0]
                    ? 'bg-[#3d1e0f] text-amber-100 shadow-sm'
                    : 'bg-amber-100 hover:bg-amber-200 text-[#3d1e0f]'
                }`}
                title="Tampilkan transaksi hari ini"
              >
                ⚡ Hari Ini
              </button>

              {/* Preset Button: Kemarin */}
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setFilterDate(d.toISOString().split('T')[0]);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  (() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    return filterDate === d.toISOString().split('T')[0];
                  })()
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Tampilkan transaksi kemarin"
              >
                Kemarin
              </button>

              {(isOwner || isAdminPusat) && (
                <button
                  onClick={() => setFilterDate('')}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold"
                  title="Tampilkan seluruh riwayat tanpa batasan tanggal"
                >
                  Semua Tanggal
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Pilih Bulan:</span>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
              />
            </div>
          )}

          {/* Active Filter Indicator */}
          <div className="ml-auto text-xs text-slate-500 font-semibold hidden md:block">
            Periode: <strong className="text-slate-800">{filterMode === 'date' ? (filterDate ? formatDate(filterDate) : 'Semua Tanggal') : filterMonth}</strong>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      {ownerMainTab === 'shift_checker' || isEmployee ? (
        <div className="space-y-6">

          {/* 3 Main Summary Cards: Pemasukan, Pengeluaran, Kas Fisik */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Total Pemasukan (Omzet Penjualan) */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="absolute right-3 -bottom-3 opacity-10 pointer-events-none">
                <ShoppingCart className="w-28 h-28" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-100 tracking-wide uppercase flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  Total Pemasukan (Omzet)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/40 text-emerald-100">
                  {shiftMetrics.totalTransactions} TRX
                </span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight font-mono">
                {formatRupiah(shiftMetrics.grossSales)}
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-500/40 grid grid-cols-2 gap-2 text-[11px] text-emerald-100">
                <div>
                  <span className="opacity-75 block text-[10px]">💵 Tunai (Cash):</span>
                  <strong className="font-mono text-xs text-white">{formatRupiah(shiftMetrics.cashSales)}</strong>
                </div>
                <div>
                  <span className="opacity-75 block text-[10px]">📱 QRIS / Non-Tunai:</span>
                  <strong className="font-mono text-xs text-white">{formatRupiah(shiftMetrics.nonCashSales)}</strong>
                </div>
              </div>
            </div>

            {/* 2. Total Pengeluaran (Belanja Operasional) */}
            <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="absolute right-3 -bottom-3 opacity-10 pointer-events-none">
                <Wallet className="w-28 h-28" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-100 tracking-wide uppercase flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-300 stroke-[3]" />
                  Total Pengeluaran (Belanja)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/40 text-rose-100">
                  {shiftMetrics.totalExpenseItems} Item
                </span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight font-mono">
                {formatRupiah(shiftMetrics.totalExpenses)}
              </div>
              <div className="mt-3 pt-3 border-t border-rose-500/40 grid grid-cols-2 gap-2 text-[11px] text-rose-100">
                <div>
                  <span className="opacity-75 block text-[10px]">🏪 Kas Toko (Laci):</span>
                  <strong className="font-mono text-xs text-white">{formatRupiah(shiftMetrics.branchCashExpenses)}</strong>
                </div>
                <div>
                  <span className="opacity-75 block text-[10px]">👤 Uang Pribadi:</span>
                  <strong className="font-mono text-xs text-white">{formatRupiah(shiftMetrics.personalExpenses)}</strong>
                </div>
              </div>
            </div>

            {/* 3. Kas Fisik Laci (Setoran Shift) */}
            <div className="bg-gradient-to-br from-[#3d1e0f] to-amber-950 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="absolute right-3 -bottom-3 opacity-10 pointer-events-none">
                <DollarSign className="w-28 h-28" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-200 tracking-wide uppercase flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-amber-300 stroke-[3]" />
                  Kas Fisik Laci (Wajib Setor)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/30 text-amber-200">
                  Siap Setor
                </span>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight font-mono text-amber-300">
                {formatRupiah(shiftMetrics.expectedDrawerCash)}
              </div>
              <div className="mt-3 pt-3 border-t border-amber-900/60 text-[10px] text-amber-200/90 space-y-0.5">
                <div className="flex justify-between">
                  <span>Modal Awal Kas:</span>
                  <span className="font-mono font-bold text-white">{formatRupiah(shiftMetrics.defaultInitialCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(+) Tunai Masuk:</span>
                  <span className="font-mono font-bold text-emerald-300">+{formatRupiah(shiftMetrics.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(-) Belanja Kas Toko:</span>
                  <span className="font-mono font-bold text-rose-300">-{formatRupiah(shiftMetrics.branchCashExpenses)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Tabs for Details */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            
            {/* Tab Buttons */}
            <div className="flex border-b border-slate-100 bg-slate-50/60 p-2 gap-2">
              <button
                onClick={() => setActiveDetailTab('sales')}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                  activeDetailTab === 'sales'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Rincian Pemasukan ({filteredSales.length} Transaksi)</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('expenses')}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                  activeDetailTab === 'expenses'
                    ? 'bg-white text-rose-800 shadow-xs border border-slate-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wallet className="w-4 h-4 text-rose-600" />
                <span>Rincian Pengeluaran ({filteredExpenses.length} Belanja)</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('closing')}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                  activeDetailTab === 'closing'
                    ? 'bg-white text-[#3d1e0f] shadow-xs border border-slate-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <span>Status Tutup Kas ({filteredReports.length})</span>
              </button>
            </div>

            {/* Tab 1: Pemasukan (Sales) */}
            {activeDetailTab === 'sales' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <span>Daftar Transaksi Penjualan</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      Total: {formatRupiah(shiftMetrics.grossSales)}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {filterMode === 'date' ? formatDate(filterDate) : filterMonth}
                  </span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">Memuat transaksi...</div>
                ) : filteredSales.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">Tidak ada transaksi penjualan pada periode ini</p>
                    <p className="text-xs text-slate-400">Transaksi yang dibuat kasir pada tanggal ini akan muncul di sini secara otomatis.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSales.map((sale) => (
                      <div key={sale.id} className="py-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-xs text-slate-900">
                              {sale.transaction_number}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTimeOnly(sale.created_at)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sale.payment_method === 'tunai'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {sale.payment_method === 'tunai' ? '💵 Tunai' : `📱 ${sale.payment_method.toUpperCase()}`}
                            </span>
                          </div>

                          {/* Items summary */}
                          <div className="text-xs text-slate-600 space-y-0.5">
                            {sale.items && sale.items.length > 0 ? (
                              <p className="line-clamp-2">
                                {sale.items.map((it, idx) => (
                                  <span key={idx}>
                                    <strong>{it.quantity}x</strong> {it.product_name_snapshot}
                                    {it.variant_details_snapshot && it.variant_details_snapshot.length > 0 && (
                                      <span className="text-[10px] text-slate-400"> ({it.variant_details_snapshot.map((v) => v.name).join(', ')})</span>
                                    )}
                                    {idx < (sale.items?.length || 1) - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </p>
                            ) : (
                              <p className="text-slate-400 italic">Transaksi menu Pancong</p>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400">
                            Kasir: <strong className="text-slate-600">{sale.seller_name || 'Kasir'}</strong> • Cabang: {sale.branch_name || 'Cabang'}
                          </div>
                        </div>

                        <div className="text-right sm:shrink-0">
                          <div className="font-mono font-black text-sm text-[#3d1e0f]">
                            {formatRupiah(sale.total_amount)}
                          </div>
                          {sale.payment_method === 'tunai' && sale.cash_received > sale.total_amount && (
                            <div className="text-[10px] text-slate-400">
                              Bayar: {formatRupiah(sale.cash_received)} (Kemb: {formatRupiah(sale.cash_change)})
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Pengeluaran (Expenses) */}
            {activeDetailTab === 'expenses' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <span>Daftar Pengeluaran & Belanja</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                      Total: {formatRupiah(shiftMetrics.totalExpenses)}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {filterMode === 'date' ? formatDate(filterDate) : filterMonth}
                  </span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">Memuat pengeluaran...</div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">Belum ada pengeluaran dicatat pada periode ini</p>
                    <p className="text-xs text-slate-400">Belanja operasional atau bahan baku yang dicatat akan muncul di sini.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => (
                      <div key={exp.id} className="py-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">
                              {exp.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                              {exp.category_name || 'Bahan Baku'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                exp.payment_method === 'kas_cabang'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {exp.payment_method === 'kas_cabang' ? '🏪 Kas Toko' : '👤 Uang Pribadi'}
                            </span>
                          </div>

                          {exp.notes && (
                            <p className="text-xs text-slate-500 italic">
                              "{exp.notes}"
                            </p>
                          )}

                          <div className="text-[10px] text-slate-400">
                            Dicatat oleh: <strong className="text-slate-600">{exp.created_by_name || 'Karyawan'}</strong> • Tanggal: {formatDate(exp.expense_date)}
                          </div>
                        </div>

                        <div className="text-right sm:shrink-0">
                          <div className="font-mono font-black text-sm text-rose-700">
                            {formatRupiah(exp.amount)}
                          </div>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              exp.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {exp.status === 'approved' ? 'Disetujui' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Status Tutup Kas Shift (Closing Reports) */}
            {activeDetailTab === 'closing' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Riwayat Laporan Tutup Kas Cabang
                  </h3>
                  <button
                    onClick={handleOpenTutupKasModal}
                    className="px-3 py-1.5 bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 rounded-xl text-xs font-bold"
                  >
                    + Buat Laporan Hari Ini
                  </button>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">Belum ada rekonsiliasi tutup kas pada tanggal ini</p>
                    <p className="text-xs text-slate-400">Gunakan tombol "+ Buat Laporan Hari Ini" untuk mengirim laporan ke Owner.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredReports.map((report) => (
                      <div key={report.id} className="py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              Laporan Cabang {report.branch_name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">({formatDate(report.report_date)})</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                report.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : report.status === 'revision_requested'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {report.status === 'approved' ? '✓ Disetujui' : report.status === 'revision_requested' ? '⚠️ Minta Revisi' : 'Menunggu Pemeriksaan'}
                            </span>
                          </div>

                          {(isOwner || isAdminPusat) && (
                            <button
                              onClick={() => handleDeleteReport(report.id, report.report_date)}
                              className="text-rose-600 hover:text-rose-800 p-1.5 rounded-xl hover:bg-rose-50"
                              title="Hapus laporan ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Total Omzet</span>
                            <strong className="font-mono text-slate-900">{formatRupiah(report.gross_sales)}</strong>
                          </div>
                          <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 block">Tunai Masuk</span>
                            <strong className="font-mono text-emerald-900">{formatRupiah(report.cash_sales)}</strong>
                          </div>
                          <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-100">
                            <span className="text-[10px] text-rose-700 block">Belanja Kas Toko</span>
                            <strong className="font-mono text-rose-900">{formatRupiah(report.branch_cash_expenses)}</strong>
                          </div>
                          <div className={`p-2 rounded-xl border ${report.cash_difference === 0 ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-200'}`}>
                            <span className="text-[10px] text-slate-500 block">Fisik Kas Laci</span>
                            <strong className="font-mono text-slate-900">{formatRupiah(report.actual_cash)}</strong>
                            <span className={`block text-[9px] font-bold ${report.cash_difference === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {report.cash_difference === 0 ? '✓ Pas Sesuai' : `Selisih: ${formatRupiah(report.cash_difference)}`}
                            </span>
                          </div>
                        </div>

                        {report.notes && (
                          <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                            <strong>Catatan ({report.submitted_by_name}):</strong> "{report.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      ) : (
        /* Owner View: Arsip Tutup Kas Seluruh Cabang Table */
        <div id="receipt-print-area" className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="border-b border-dashed border-slate-300 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-base text-slate-900 uppercase">{settings.app_name}</h2>
              <p className="text-xs text-slate-500">{settings.brand_owner}</p>
              <p className="text-xs font-bold text-[#3d1e0f] mt-1">ARSIP REKONSILIASI KAS HARIAN CABANG</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-slate-800">
                Periode: {filterMode === 'date' ? (filterDate ? formatDate(filterDate) : 'Semua Tanggal') : filterMonth}
              </p>
              <p className="text-[10px] text-slate-400">Total: {filteredReports.length} Laporan</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold">Memuat arsip laporan...</div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Belum Ada Laporan Tutup Kas Pada Periode Ini</p>
              <p className="text-xs text-slate-400">Laporan tutup kas yang dikirim kasir akan tersimpan rapi di sini.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div key={report.id} className="py-4 hover:bg-slate-50 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        Cabang {report.branch_name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono font-bold">({formatDate(report.report_date)})</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          report.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : report.status === 'revision_requested'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {report.status === 'approved' ? 'Disetujui' : report.status === 'revision_requested' ? 'Perlu Revisi' : 'Menunggu Pemeriksaan'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      {report.status === 'pending' && (isOwner || isAdminPusat) && (
                        <>
                          <button
                            onClick={() => handleReviewReport(report.id, 'approved')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleReviewReport(report.id, 'revision_requested')}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 text-[#3d1e0f] font-bold text-xs hover:bg-amber-600"
                          >
                            Minta Revisi
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDeleteReport(report.id, report.report_date)}
                        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Laporan Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-medium">Total Omzet</p>
                      <p className="font-extrabold text-[#3d1e0f] text-sm">{formatRupiah(report.gross_sales)}</p>
                      <p className="text-[10px] text-slate-500">{report.total_transactions} Transaksi</p>
                    </div>

                    <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] text-emerald-700 font-medium">Penerimaan Tunai</p>
                      <p className="font-extrabold text-emerald-900 text-sm">{formatRupiah(report.cash_sales)}</p>
                      <p className="text-[10px] text-emerald-600">Non-Tunai: {formatRupiah(report.non_cash_sales)}</p>
                    </div>

                    <div className="bg-rose-50/60 p-2.5 rounded-2xl border border-rose-100">
                      <p className="text-[10px] text-rose-700 font-medium">Pengeluaran Kas Cabang</p>
                      <p className="font-extrabold text-rose-900 text-sm">{formatRupiah(report.branch_cash_expenses)}</p>
                    </div>

                    <div className={`p-2.5 rounded-2xl border ${report.cash_difference === 0 ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-200'}`}>
                      <p className="text-[10px] text-slate-500 font-medium">Fisik Kas Laci</p>
                      <p className="font-extrabold text-slate-900 text-sm">{formatRupiah(report.actual_cash)}</p>
                      <p className={`text-[10px] font-bold ${report.cash_difference === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {report.cash_difference === 0 ? '✓ Tepat Sesuai' : `Selisih: ${formatRupiah(report.cash_difference)}`}
                      </p>
                    </div>
                  </div>

                  {report.notes && (
                    <p className="text-xs text-slate-500 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      <strong>Catatan Kasir ({report.submitted_by_name}):</strong> "{report.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slip Modal: Struk Rekapitulasi Shift Kasir (Thermal 58mm/80mm Ready) */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#3d1e0f] text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Struk Rekap Shift Kasir</h3>
              </div>
              <button
                onClick={() => setShowSlipModal(false)}
                className="p-1 rounded-full text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Slip Content */}
            <div id="receipt-print-area" className="p-5 overflow-y-auto bg-slate-50 font-mono text-xs text-slate-900 space-y-3">
              
              {/* Brand Header */}
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <h2 className="font-black text-sm uppercase text-slate-900">{settings.app_name}</h2>
                <p className="text-[10px] text-slate-500 font-sans">{settings.brand_owner}</p>
                <p className="text-xs font-bold text-[#3d1e0f] mt-1">REKAPITULASI TRANSAKSI SHIFT</p>
              </div>

              {/* Meta Info */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cabang:</span>
                  <span className="font-bold">{currentBranchObj?.name || 'Cidodol'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kasir:</span>
                  <span className="font-bold">{targetEmployeeObj?.full_name || user?.full_name || 'Kasir'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal:</span>
                  <span>{filterMode === 'date' ? formatDate(filterDate) : filterMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Cetak:</span>
                  <span>{formatTimeOnly(new Date())} WIB</span>
                </div>
              </div>

              {/* Section 1: Pemasukan Penjualan */}
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-3">
                <p className="font-bold text-[#3d1e0f] text-[11px]">PEMASUKAN (PENJUALAN):</p>
                <div className="flex justify-between">
                  <span>Jumlah Transaksi:</span>
                  <span className="font-bold">{shiftMetrics.totalTransactions} TRX</span>
                </div>
                <div className="flex justify-between">
                  <span>Penerimaan Tunai:</span>
                  <span className="font-bold">{formatRupiah(shiftMetrics.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Non-Tunai (QRIS/Trf):</span>
                  <span className="font-bold">{formatRupiah(shiftMetrics.nonCashSales)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dotted border-slate-300 font-extrabold text-[12px]">
                  <span>TOTAL OMZET:</span>
                  <span>{formatRupiah(shiftMetrics.grossSales)}</span>
                </div>
              </div>

              {/* Section 2: Pengeluaran Belanja */}
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-3">
                <p className="font-bold text-rose-800 text-[11px]">PENGELUARAN (BELANJA):</p>
                <div className="flex justify-between">
                  <span>Dari Kas Toko (Laci):</span>
                  <span className="font-bold">{formatRupiah(shiftMetrics.branchCashExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uang Pribadi Kasir:</span>
                  <span className="font-bold">{formatRupiah(shiftMetrics.personalExpenses)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dotted border-slate-300 font-extrabold text-[12px] text-rose-900">
                  <span>TOTAL BELANJA:</span>
                  <span>{formatRupiah(shiftMetrics.totalExpenses)}</span>
                </div>
              </div>

              {/* Section 3: Rekapitulasi Kas Fisik Laci */}
              <div className="space-y-1 border-b border-dashed border-slate-400 pb-3 bg-amber-50/80 p-2 rounded-xl">
                <p className="font-extrabold text-[#3d1e0f] text-[11px]">REKAP KAS FISIK LACI:</p>
                <div className="flex justify-between text-[11px]">
                  <span>Modal Awal Kas:</span>
                  <span>{formatRupiah(shiftMetrics.defaultInitialCash)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-800">
                  <span>(+) Uang Tunai Masuk:</span>
                  <span>+{formatRupiah(shiftMetrics.cashSales)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-rose-800">
                  <span>(-) Belanja Kas Toko:</span>
                  <span>-{formatRupiah(shiftMetrics.branchCashExpenses)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-400 font-black text-sm text-[#3d1e0f]">
                  <span>TOTAL WAJIB SETOR:</span>
                  <span>{formatRupiah(shiftMetrics.expectedDrawerCash)}</span>
                </div>
              </div>

              {/* Signatures for handover */}
              <div className="pt-2 text-center text-[10px] space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500">Kasir Bertugas,</p>
                    <div className="h-10"></div>
                    <p className="font-bold border-t border-slate-400 pt-1">
                      ( {targetEmployeeObj?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Kasir'} )
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Penerima / Owner,</p>
                    <div className="h-10"></div>
                    <p className="font-bold border-t border-slate-400 pt-1">( Nasrullah )</p>
                  </div>
                </div>
                <p className="text-slate-400 italic text-[9px]">
                  *** Terima Kasih atas Kerja Kerasnya Hari Ini ***
                </p>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 print:hidden">
              <button
                onClick={() => setShowSlipModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Thermal</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tutup Kas Shift Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                Form Tutup Kas & Rekonsiliasi Shift
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date & Branch Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tanggal Tutup Kas</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Cabang</label>
                {(isOwner || isAdminPusat) ? (
                  <select
                    value={reportBranchId}
                    onChange={(e) => setReportBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-800">
                    {activeBranch?.name || 'Cabang'}
                  </div>
                )}
              </div>
            </div>

            {/* Calculated Breakdown Box */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5 text-xs">
              <p className="font-bold text-[#3d1e0f]">
                Rekap Data Penjualan & Pengeluaran ({formatDate(reportDate)}):
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                <div>Omzet Penjualan: <strong className="text-slate-900">{formatRupiah(shiftMetrics.grossSales)}</strong></div>
                <div>Jumlah Transaksi: <strong className="text-slate-900">{shiftMetrics.totalTransactions} TRX</strong></div>
                <div>Penjualan Tunai: <strong className="text-emerald-700">{formatRupiah(shiftMetrics.cashSales)}</strong></div>
                <div>Non-Tunai (QRIS/Trf): <strong className="text-slate-900">{formatRupiah(shiftMetrics.nonCashSales)}</strong></div>
                <div>Belanja Kas Toko: <strong className="text-rose-700">{formatRupiah(shiftMetrics.branchCashExpenses)}</strong></div>
                <div>Modal Awal Kas: <strong className="text-slate-900">{formatRupiah(initialCashInput)}</strong></div>
              </div>
            </div>

            <form onSubmit={handleSubmitClosingReport} className="space-y-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Kas Yang Diharapkan (Expected):</span>
                  <span className="font-bold font-mono text-amber-300">
                    {formatRupiah(initialCashInput + shiftMetrics.cashSales - shiftMetrics.branchCashExpenses)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Uang Tunai Fisik Riil di Laci Kasir (Rp) *
                </label>
                <input
                  type="number"
                  required
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder="Masukkan jumlah fisik uang kertas & koin"
                  className="w-full px-3.5 py-3 border border-slate-300 rounded-2xl text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                />
              </div>

              {actualCashInput !== '' && (
                (() => {
                  const expected = initialCashInput + shiftMetrics.cashSales - shiftMetrics.branchCashExpenses;
                  const diff = Number(actualCashInput) - expected;
                  return (
                    <div className={`p-3 rounded-2xl text-xs font-bold ${diff === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {diff === 0
                        ? '✓ Uang kas laci PAS & tepat sesuai rekapitulasi!'
                        : `⚠️ Terdapat selisih kas sebesar ${formatRupiah(diff)} (${diff > 0 ? 'Lebih' : 'Kurang'})`}
                    </div>
                  );
                })()
              )}

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Catatan Shift (Opsional)</label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Catatan sisa adonan pancong, serah terima laci, dll..."
                  rows={2}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || actualCashInput === ''}
                  className="flex-1 py-3 rounded-xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Kirim Laporan Tutup Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
