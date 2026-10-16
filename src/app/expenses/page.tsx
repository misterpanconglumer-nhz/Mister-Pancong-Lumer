'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Expense } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDate } from '@/lib/utils/formatters';
import { Wallet, Plus, Edit, Trash2, Tag, Store, Check, X, Calendar, Filter, RotateCcw, Search } from 'lucide-react';

export default function ExpensesPage() {
  const { user, activeBranch, branches, isOwner, isAdminPusat, isAdminCabang } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Dates & Default Parameter
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = yesterdayObj.toISOString().split('T')[0];
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  // Parameter Filter: Hari Ini (Default), Kemarin, Tanggal, Bulan, Cabang & Pencarian
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');
  const [filterDate, setFilterDate] = useState<string>(todayStr); // DEFAULT HARI INI
  const [filterMonth, setFilterMonth] = useState<string>(thisMonthStr);
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form states
  const [title, setTitle] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [expenseDateInput, setExpenseDateInput] = useState<string>(todayStr);
  const [categoryName, setCategoryName] = useState<string>('Bahan Baku');
  const [paymentMethod, setPaymentMethod] = useState<'kas_cabang' | 'uang_pribadi'>('kas_cabang');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await DataService.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSetToday = () => {
    setFilterMode('date');
    setFilterDate(todayStr);
  };

  const handleSetYesterday = () => {
    setFilterMode('date');
    setFilterDate(yesterdayStr);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterBranchId('all');
    setFilterMode('date');
    setFilterDate(todayStr);
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setTitle('');
    setAmountInput('');
    setExpenseDateInput(filterDate || todayStr);
    setCategoryName('Bahan Baku');
    setPaymentMethod('kas_cabang');
    setNotes('');
    setStatus(isOwner ? 'approved' : 'pending');
    setShowModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmountInput(String(exp.amount));
    setExpenseDateInput(exp.expense_date ? exp.expense_date.split('T')[0] : todayStr);
    setCategoryName(exp.category_name || 'Bahan Baku');
    setPaymentMethod(exp.payment_method);
    setNotes(exp.notes || '');
    setStatus(exp.status);
    setShowModal(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) {
      await DataService.deleteExpense(expenseId);
      await fetchExpenses();
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amountInput) {
      alert('Mohon isi nama dan nominal pengeluaran!');
      return;
    }

    const effectiveUserId = user?.id || '33333333-3333-3333-3333-333333333333';
    const effectiveUserName = user?.full_name || 'Next Karyawan';
    const effectiveBranchId = activeBranch?.id || 'd9ec11ac-c42f-4904-b932-20abbe83e89e';
    const effectiveBranchName = activeBranch?.name || 'Cidodol';

    setIsSubmitting(true);
    try {
      const saved = await DataService.saveExpense({
        id: editingExpense ? editingExpense.id : undefined,
        branch_id: editingExpense ? editingExpense.branch_id : effectiveBranchId,
        branch_name: editingExpense ? editingExpense.branch_name : effectiveBranchName,
        category_name: categoryName,
        title: title.trim(),
        amount: Number(amountInput) || 0,
        payment_method: paymentMethod,
        notes: notes.trim(),
        status,
        created_by: editingExpense ? editingExpense.created_by : effectiveUserId,
        created_by_name: editingExpense ? editingExpense.created_by_name : effectiveUserName,
        expense_date: expenseDateInput || (editingExpense ? editingExpense.expense_date : todayStr),
      });

      // Optimistic update
      setExpenses((prev) => {
        const filtered = prev.filter((item) => item.id !== saved.id);
        return [saved, ...filtered];
      });

      setShowModal(false);
      setEditingExpense(null);
      await fetchExpenses();
      alert('✓ Catatan pengeluaran berhasil disimpan!');
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      alert('Gagal menyimpan pengeluaran: ' + (err?.message || 'Terjadi kendala jaringan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (expenseId: string, newStatus: 'approved' | 'rejected') => {
    if (!user) return;
    await DataService.updateExpenseStatus(expenseId, newStatus, user.id);
    await fetchExpenses();
  };

  // Filter calculations
  const filteredExpenses = expenses.filter((e) => {
    // 1. Branch filter
    if (!isOwner && !isAdminPusat && activeBranch && e.branch_id !== activeBranch.id) {
      return false;
    }
    if (filterBranchId !== 'all' && e.branch_id !== filterBranchId) {
      return false;
    }

    // 2. Date / Month parameter filter
    const expDate = e.expense_date ? e.expense_date.split('T')[0] : '';
    if (filterMode === 'date') {
      if (filterDate && expDate !== filterDate) {
        return false;
      }
    } else {
      if (filterMonth && !expDate.startsWith(filterMonth)) {
        return false;
      }
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchCat = e.category_name?.toLowerCase().includes(q);
      const matchSubmitter = e.created_by_name?.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchSubmitter && !matchNotes) return false;
    }

    return true;
  });

  const totalFilteredAmount = filteredExpenses
    .filter((e) => e.status !== 'rejected')
    .reduce((sum, e) => sum + e.amount, 0);

  const kasCabangTotal = filteredExpenses
    .filter((e) => e.payment_method === 'kas_cabang' && e.status !== 'rejected')
    .reduce((sum, e) => sum + e.amount, 0);

  const uangPribadiTotal = filteredExpenses
    .filter((e) => e.payment_method === 'uang_pribadi' && e.status !== 'rejected')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Pengeluaran Operasional</h1>
          <p className="text-xs text-slate-500 mt-0.5">Catatan belanja bahan baku, kemasan & operasional cabang</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 font-extrabold text-xs flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-rose-600" />
            <span>Total: {formatRupiah(totalFilteredAmount)}</span>
          </div>
          <button
            onClick={handleOpenAdd}
            className="py-2.5 sm:py-3 px-4 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Parameter Filter Bar: Hari Ini (Default), Kemarin, Tanggal, Bulan & Cabang */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Mode Switcher: Filter Tanggal vs Filter Bulan */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setFilterMode('date');
                if (!filterDate) setFilterDate(todayStr);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'date'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Filter Tanggal
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'month'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Filter Bulan
            </button>
          </div>

          {/* Branch Picker (Owner & Admin) */}
          {(isOwner || isAdminPusat) && (
            <div className="w-full sm:w-56">
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
              >
                <option value="all">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Cabang {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date Inputs & Quick Preset Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100 items-center">
          
          {/* Search Box */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengeluaran, kategori..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
            />
          </div>

          {/* Parameter Date Controls */}
          <div className="md:col-span-8 flex flex-wrap items-center gap-2">
            {filterMode === 'date' ? (
              <>
                <button
                  type="button"
                  onClick={handleSetToday}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                    filterDate === todayStr
                      ? 'bg-[#3d1e0f] text-amber-100 shadow-sm ring-2 ring-amber-400'
                      : 'bg-amber-100 hover:bg-amber-200 text-[#3d1e0f]'
                  }`}
                  title="Tampilkan Pengeluaran Hari Ini (Default)"
                >
                  <span>Hari Ini</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                    filterDate === yesterdayStr
                      ? 'bg-[#3d1e0f] text-amber-100 shadow-sm ring-2 ring-amber-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Tampilkan Pengeluaran Kemarin"
                >
                  <span>Kemarin</span>
                </button>
                <div className="relative min-w-[140px] flex-1 sm:flex-initial">
                  <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f] ${
                      filterDate && filterDate !== todayStr && filterDate !== yesterdayStr
                        ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/50'
                        : 'border-slate-200'
                    }`}
                  />
                </div>
                {(isOwner || isAdminPusat) && (
                  <button
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="px-2.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold"
                    title="Tampilkan Semua Pengeluaran Tanpa Filter Tanggal"
                  >
                    Tampilkan Semua
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
          </div>
        </div>

        {/* Breakdown Tag / Status Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600">
            <span className="font-bold">
              Periode:{' '}
              <strong className="text-slate-900">
                {filterMode === 'date'
                  ? filterDate === todayStr
                    ? 'Hari Ini'
                    : filterDate === yesterdayStr
                    ? 'Kemarin'
                    : filterDate
                    ? formatDate(filterDate)
                    : 'Semua Tanggal'
                  : `Bulan ${filterMonth}`}
              </strong>
            </span>
            <span>•</span>
            <span className="font-semibold">{filteredExpenses.length} Transaksi</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Kas Cabang: {formatRupiah(kasCabangTotal)}</span>
            {uangPribadiTotal > 0 && (
              <>
                <span>•</span>
                <span className="text-blue-700 font-semibold">Uang Pribadi: {formatRupiah(uangPribadiTotal)}</span>
              </>
            )}
          </div>

          {(filterDate !== todayStr || filterBranchId !== 'all' || searchQuery || filterMode !== 'date') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Hari Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* List Expenses */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">Memuat pengeluaran...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">
              Belum Ada Pengeluaran Pada {filterMode === 'date' ? (filterDate === todayStr ? 'Hari Ini' : filterDate === yesterdayStr ? 'Kemarin' : filterDate ? formatDate(filterDate) : 'Periode Ini') : `Bulan ${filterMonth}`}
            </p>
            <p className="text-[11px] text-slate-400">
              Gunakan tombol "+ Tambah Pengeluaran" di atas untuk mencatat pengeluaran baru.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">{exp.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        exp.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exp.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {exp.status === 'approved'
                        ? 'Disetujui'
                        : exp.status === 'rejected'
                        ? 'Ditolak'
                        : 'Menunggu Persetujuan'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-bold text-[#3d1e0f]">
                      <Tag className="w-3 h-3 text-amber-600" />
                      {exp.category_name || 'Umum'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-slate-400" />
                      {exp.branch_name || 'Cabang'}
                    </span>
                    <span>• {exp.payment_method === 'kas_cabang' ? '💰 Kas Cabang' : '👤 Uang Pribadi'}</span>
                    <span>• {formatDate(exp.expense_date)}</span>
                  </div>

                  {exp.notes && <p className="text-[11px] text-slate-400 italic">"{exp.notes}"</p>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-left sm:text-right">
                    <p className="text-sm sm:text-base font-black text-rose-600 font-mono">{formatRupiah(exp.amount)}</p>
                    <p className="text-[10px] text-slate-400">Oleh: {exp.created_by_name}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Approve/Reject for pending status */}
                    {exp.status === 'pending' && (isOwner || isAdminPusat || isAdminCabang) && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(exp.id, 'approved')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs hover:bg-emerald-200"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(exp.id, 'rejected')}
                          className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs hover:bg-rose-200"
                        >
                          Tolak
                        </button>
                      </>
                    )}

                    {/* Edit & Delete Buttons for Owner */}
                    {(isOwner || isAdminPusat) && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                          title="Edit Pengeluaran"
                        >
                          <Edit className="w-4 h-4 text-amber-800" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Pengeluaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-900">
              {editingExpense ? 'Edit Catatan Pengeluaran' : 'Catat Pengeluaran Baru'}
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama / Keterangan Pengeluaran</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Beli 5kg Keju & 2 Bal Es Batu"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="75000"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Pengeluaran</label>
                  <input
                    type="date"
                    required
                    value={expenseDateInput}
                    onChange={(e) => setExpenseDateInput(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="Bahan Baku">Bahan Baku</option>
                  <option value="Kemasan">Kemasan</option>
                  <option value="Es & Bahan Tambahan">Es & Bahan Tambahan</option>
                  <option value="Transportasi Operasional">Transportasi Operasional</option>
                  <option value="Perlengkapan">Perlengkapan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sumber Uang Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('kas_cabang')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      paymentMethod === 'kas_cabang'
                        ? 'bg-[#3d1e0f] text-amber-200 border-[#3d1e0f]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    💰 Kas Cabang
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('uang_pribadi')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      paymentMethod === 'uang_pribadi'
                        ? 'bg-[#3d1e0f] text-amber-200 border-[#3d1e0f]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    👤 Uang Pribadi
                  </button>
                </div>
              </div>

              {editingExpense && isOwner && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status Persetujuan</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="approved">Disetujui</option>
                    <option value="pending">Menunggu Persetujuan</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Beli di Toko Jaya Makmur"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-md"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
