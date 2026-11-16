'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SaleTransaction } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDateTime, formatDate } from '@/lib/utils/formatters';
import { Search, Filter, Receipt, Ban, Eye, Printer, Calendar, Store, User, RotateCcw, Trash2, DollarSign, UtensilsCrossed, X, ArrowRight } from 'lucide-react';
import ReceiptModal from '@/components/pos/ReceiptModal';

export default function SalesHistoryPage() {
  const { user, activeBranch, branches, setActiveBranch, isOwner, isAdminPusat, isAdminCabang } = useAuth();
  const isKasir = !isOwner && !isAdminPusat;

  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>(activeBranch?.id || 'all');
  const [filterDateMode, setFilterDateMode] = useState<'single' | 'range'>('single');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTx, setSelectedTx] = useState<SaleTransaction | null>(null);

  // View Mode: 'transactions' (Daftar TRX) vs 'menu_recap' (Rekap Menu Terjual)
  const [viewMode, setViewMode] = useState<'transactions' | 'menu_recap'>('transactions');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [menuSortBy, setMenuSortBy] = useState<'qty_desc' | 'revenue_desc' | 'name_asc'>('qty_desc');

  // Cancellation modal states
  const [txToCancel, setTxToCancel] = useState<SaleTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await DataService.getSales();
      setSales(data);
    } catch (err) {
      console.error('Error loading sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [activeBranch]);

  // Sync branch filter when activeBranch changes from navbar
  useEffect(() => {
    if (activeBranch?.id) {
      setFilterBranchId(activeBranch.id);
    }
  }, [activeBranch?.id]);

  // Preset Date Handlers & Strings
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

  const handleSetToday = () => {
    setFilterDate(todayStr);
  };

  const handleSetYesterday = () => {
    setFilterDate(yesterdayStr);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterBranchId('all');
    setFilterDate('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Label text for active date filter
  const dateFilterLabel = useMemo(() => {
    if (filterDateMode === 'single') {
      if (!filterDate) return 'Semua Tanggal';
      if (filterDate === todayStr) return 'Hari Ini';
      if (filterDate === yesterdayStr) return 'Kemarin';
      return formatDate(filterDate);
    }
    if (filterStartDate && filterEndDate) {
      if (filterStartDate === filterEndDate) return formatDate(filterStartDate);
      return `${formatDate(filterStartDate)} s/d ${formatDate(filterEndDate)}`;
    }
    if (filterStartDate) return `Mulai ${formatDate(filterStartDate)}`;
    if (filterEndDate) return `Sampai ${formatDate(filterEndDate)}`;
    return 'Semua Rentang Tanggal';
  }, [filterDateMode, filterDate, filterStartDate, filterEndDate, todayStr, yesterdayStr]);

  // Filter logic
  const filteredSales = sales.filter((s) => {
    // Non-owner / non-admin only sees own branch
    if (!isOwner && !isAdminPusat && activeBranch && s.branch_id !== activeBranch.id) {
      return false;
    }

    if (filterBranchId !== 'all') {
      const bObj = branches.find((b) => b.id === filterBranchId);
      const matchId = s.branch_id === filterBranchId;
      const matchName = bObj && (s.branch_name === bObj.name || s.branch_id === bObj.code);
      if (!matchId && !matchName) return false;
    }

    // Filter by single date or date range
    if (filterDateMode === 'single') {
      if (filterDate !== '') {
        const txDate = s.created_at.split('T')[0];
        if (txDate !== filterDate) return false;
      }
    } else {
      const txDate = s.created_at.split('T')[0];
      if (filterStartDate && txDate < filterStartDate) return false;
      if (filterEndDate && txDate > filterEndDate) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTrxNum = s.transaction_number.toLowerCase().includes(q);
      const matchSeller = s.seller_name?.toLowerCase().includes(q);
      if (!matchTrxNum && !matchSeller) return false;
    }

    return true;
  });

  const totalOmzetFiltered = filteredSales
    .filter((s) => s.status === 'completed')
    .reduce((acc, curr) => acc + curr.total_amount, 0);

  // Rekapitulasi Menu Terjual (Berapa banyak menu yang laku per parameter tanggal)
  const soldMenuItemsSummary = React.useMemo(() => {
    const map: {
      [name: string]: {
        name: string;
        quantity: number;
        totalRevenue: number;
        transactionsCount: number;
        variants: { [v: string]: number };
      };
    } = {};

    let grandTotalQty = 0;
    let grandTotalRevenue = 0;

    filteredSales
      .filter((s) => s.status === 'completed')
      .forEach((sale) => {
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach((it) => {
            const rawName = (it.product_name_snapshot || 'Menu Pancong').trim();
            const qty = Number(it.quantity) || 1;
            const rev = Number(it.subtotal) || ((Number(it.unit_price_snapshot) || 0) * qty);

            if (!map[rawName]) {
              map[rawName] = {
                name: rawName,
                quantity: 0,
                totalRevenue: 0,
                transactionsCount: 0,
                variants: {},
              };
            }

            map[rawName].quantity += qty;
            map[rawName].totalRevenue += rev;
            map[rawName].transactionsCount += 1;
            grandTotalQty += qty;
            grandTotalRevenue += rev;

            if (it.variant_details_snapshot && Array.isArray(it.variant_details_snapshot)) {
              it.variant_details_snapshot.forEach((v) => {
                const vName = v.name?.trim() || 'Standar';
                map[rawName].variants[vName] = (map[rawName].variants[vName] || 0) + qty;
              });
            }
          });
        } else if ((sale as any).notes) {
          const parts = String((sale as any).notes).split(',');
          parts.forEach((p) => {
            const match = p.trim().match(/^(\d+)\s*x\s*(.+)$/i);
            if (match) {
              const qty = parseInt(match[1], 10) || 1;
              const name = match[2].trim();
              if (!map[name]) {
                map[name] = {
                  name,
                  quantity: 0,
                  totalRevenue: 0,
                  transactionsCount: 0,
                  variants: {},
                };
              }
              map[name].quantity += qty;
              map[name].transactionsCount += 1;
              grandTotalQty += qty;
            }
          });
        }
      });

    let items = Object.values(map).map((item) => ({
      ...item,
      percentage: grandTotalQty > 0 ? Math.round((item.quantity / grandTotalQty) * 100) : 0,
    }));

    if (menuSearchQuery.trim()) {
      const q = menuSearchQuery.toLowerCase();
      items = items.filter((it) => it.name.toLowerCase().includes(q));
    }

    if (menuSortBy === 'qty_desc') {
      items.sort((a, b) => b.quantity - a.quantity);
    } else if (menuSortBy === 'revenue_desc') {
      items.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (menuSortBy === 'name_asc') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      items,
      grandTotalQty,
      grandTotalRevenue,
      uniqueCount: Object.keys(map).length,
    };
  }, [filteredSales, menuSearchQuery, menuSortBy]);

  const handleDeleteTransaction = async (tx: SaleTransaction) => {
    const confirmMsg = `Hapus transaksi ${tx.transaction_number} (Total: ${formatRupiah(tx.total_amount)}) secara permanen?\n\nTindakan ini tidak dapat dibatalkan.`;
    if (window.confirm(confirmMsg)) {
      try {
        const userId = user?.id || '33333333-3333-3333-3333-333333333333';
        const userName = user?.full_name || 'Kasir / Admin';
        await DataService.deleteSaleTransaction(tx.id, userId, userName);

        // Optimistic removal
        setSales((prev) => prev.filter((s) => s.id !== tx.id));
        alert(`✓ Transaksi ${tx.transaction_number} berhasil dihapus!`);
        await fetchSales();
      } catch (err: any) {
        console.error('Failed to delete transaction:', err);
        alert('Gagal menghapus transaksi: ' + (err?.message || 'Terjadi kesalahan sistem'));
      }
    }
  };

  const handleConfirmCancel = async () => {
    if (!txToCancel || !cancelReason.trim() || !user) return;
    setIsCancelling(true);
    try {
      await DataService.cancelTransaction(txToCancel.id, cancelReason, user.id, user.full_name);
      setTxToCancel(null);
      setCancelReason('');
      await fetchSales();
    } catch (err) {
      console.error('Failed to cancel transaction:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Riwayat Penjualan</h1>
          <p className="text-xs text-slate-500 mt-0.5">Filter transaksi kasir berdasarkan tanggal, cabang, & pencarian</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-[#3d1e0f] font-bold text-xs flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>{filteredSales.length} Transaksi</span>
          </div>

          {isKasir ? (
            (filterDateMode === 'single' ? filterDate : (filterStartDate || filterEndDate)) ? (
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center gap-1.5 animate-in fade-in">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>
                  Omzet ({dateFilterLabel}): <strong>{formatRupiah(totalOmzetFiltered)}</strong>
                </span>
              </div>
            ) : (
              <div
                className="px-3.5 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs flex items-center gap-1.5"
                title="Pilih parameter tanggal di bawah untuk melihat total omzet"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Omzet: Klik Parameter Tanggal</span>
              </div>
            )
          ) : (
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-xs">
              {(filterDateMode === 'single' ? filterDate : (filterStartDate || filterEndDate))
                ? `Omzet (${dateFilterLabel}): `
                : 'Total Omzet Keseluruhan: '}
              {formatRupiah(totalOmzetFiltered)}
            </div>
          )}
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        {/* Date Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setFilterDateMode('single')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterDateMode === 'single'
                ? 'bg-white text-[#3d1e0f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 1 Tanggal (Harian)
          </button>
          <button
            type="button"
            onClick={() => setFilterDateMode('range')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterDateMode === 'range'
                ? 'bg-white text-[#3d1e0f] shadow-xs ring-2 ring-amber-400/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📆 Rentang Tanggal (Dari - Sampai)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Box */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor transaksi TRX-... atau nama kasir"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
            />
          </div>

          {/* Date Parameter Filter */}
          <div className="relative md:col-span-7 flex flex-wrap items-center gap-2">
            {filterDateMode === 'single' ? (
              <>
                <button
                  type="button"
                  onClick={handleSetToday}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                    filterDate === todayStr
                      ? 'bg-[#3d1e0f] text-amber-100 shadow-md ring-2 ring-amber-400'
                      : 'bg-amber-100 hover:bg-amber-200 text-[#3d1e0f]'
                  }`}
                  title="Filter Transaksi & Omzet Hari Ini"
                >
                  <span>Hari Ini</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                    filterDate === yesterdayStr
                      ? 'bg-[#3d1e0f] text-amber-100 shadow-md ring-2 ring-amber-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Filter Transaksi & Omzet Kemarin"
                >
                  <span>Kemarin</span>
                </button>
                <div className="relative flex-1 min-w-[140px]">
                  <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f] transition-all ${
                      filterDate && filterDate !== todayStr && filterDate !== yesterdayStr
                        ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/50'
                        : 'border-slate-200'
                    }`}
                    title="Pilih Parameter Tanggal Tertentu"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs">
                  <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Dari:</span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 text-slate-400 font-bold text-xs">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>s/d</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs">
                  <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider hidden sm:inline">Sampai:</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 6);
                    setFilterStartDate(start.toISOString().split('T')[0]);
                    setFilterEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-[#3d1e0f] transition-all"
                  title="7 Hari Terakhir"
                >
                  ⚡ 7 Hari
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 29);
                    setFilterStartDate(start.toISOString().split('T')[0]);
                    setFilterEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                  title="30 Hari Terakhir"
                >
                  30 Hari
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    setFilterStartDate(firstDay.toISOString().split('T')[0]);
                    setFilterEndDate(now.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                  title="Bulan Berjalan"
                >
                  Bulan Ini
                </button>
              </div>
            )}
          </div>

          {/* Branch Picker (Owner & Admin) */}
          {(isOwner || isAdminPusat) && (
            <div className="md:col-span-12 pt-1 border-t border-slate-100 flex items-center justify-end">
              <div className="w-full sm:w-64">
                <select
                  value={filterBranchId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterBranchId(val);
                    if (val !== 'all') {
                      const matched = branches.find((b) => b.id === val);
                      if (matched && setActiveBranch) setActiveBranch(matched);
                    }
                  }}
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
            </div>
          )}

        </div>

        {/* Active Filter Indicators */}
        {((filterDateMode === 'single' ? filterDate : (filterStartDate || filterEndDate)) || filterBranchId !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Filter Aktif:</span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-[#3d1e0f] font-mono font-bold">
                {dateFilterLabel}
              </span>
              {filterBranchId !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-[#3d1e0f] font-bold">
                  Cabang: {branches.find((b) => b.id === filterBranchId)?.name || filterBranchId}
                </span>
              )}
              {searchQuery && <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">" {searchQuery} "</span>}
            </div>

            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Banner Khusus Akun Kasir */}
      {isKasir && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-3xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {(filterDateMode === 'single' ? filterDate : (filterStartDate || filterEndDate)) ? (
                <>
                  Menampilkan data & omzet{' '}
                  <strong className="text-slate-900">{dateFilterLabel}</strong>
                  : Total Omzet Terhitung{' '}
                  <strong className="text-emerald-700 text-sm font-extrabold">{formatRupiah(totalOmzetFiltered)}</strong>
                </>
              ) : (
                <>
                  Mode Akun Kasir: Total omzet keseluruhan disembunyikan. Silakan klik tombol{' '}
                  <strong>Hari Ini</strong>, <strong>Kemarin</strong>, atau pilih <strong>Parameter Tanggal</strong> di atas untuk melihat omzet shift Anda.
                </>
              )}
            </span>
          </div>
          {!(filterDateMode === 'single' ? filterDate : (filterStartDate || filterEndDate)) && (
            <button
              type="button"
              onClick={handleSetToday}
              className="px-3 py-1.5 rounded-xl bg-[#3d1e0f] text-amber-100 font-bold text-xs hover:bg-amber-950 active:scale-95 transition-all self-start sm:self-auto shrink-0"
            >
              Tampilkan Hari Ini
            </button>
          )}
        </div>
      )}

      {/* View Switcher: Daftar Transaksi vs Rekap Menu Terjual */}
      <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md">
        <button
          onClick={() => setViewMode('transactions')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'transactions'
              ? 'bg-white text-[#3d1e0f] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-700" />
          <span>Daftar Transaksi ({filteredSales.length})</span>
        </button>
        <button
          onClick={() => setViewMode('menu_recap')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'menu_recap'
              ? 'bg-white text-amber-950 shadow-xs ring-2 ring-amber-400/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 text-amber-600" />
          <span>Rekap Menu Terjual ({soldMenuItemsSummary.grandTotalQty} Porsi)</span>
        </button>
      </div>

      {/* VIEW 1: REKAP MENU TERJUAL */}
      {viewMode === 'menu_recap' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
          {/* Header & KPI Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-700" />
                <span>Rekapitulasi Menu Terjual</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-900 font-black">
                  Total {soldMenuItemsSummary.grandTotalQty} Porsi Terjual
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cek menu apa saja yang terjual dan berapa banyak pada parameter tanggal{' '}
                <strong className="text-slate-700">
                  {dateFilterLabel}
                </strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-500 font-semibold">Omzet Menu:</span>
              <span className="font-mono text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                {formatRupiah(soldMenuItemsSummary.grandTotalRevenue)}
              </span>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Menu Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                placeholder="Cari nama menu (misal: coklat, keju, meses)..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
              />
              {menuSearchQuery && (
                <button
                  onClick={() => setMenuSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
              <span className="text-slate-400 text-[11px] font-semibold hidden md:inline">Urutkan:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setMenuSortBy('qty_desc')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    menuSortBy === 'qty_desc'
                      ? 'bg-[#3d1e0f] text-amber-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Urutkan dari yang paling banyak terjual"
                >
                  ⚡ Paling Banyak Terjual
                </button>
                <button
                  onClick={() => setMenuSortBy('revenue_desc')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    menuSortBy === 'revenue_desc'
                      ? 'bg-[#3d1e0f] text-amber-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Urutkan dari omzet rupiah tertinggi"
                >
                  💰 Omzet Tertinggi
                </button>
                <button
                  onClick={() => setMenuSortBy('name_asc')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    menuSortBy === 'name_asc'
                      ? 'bg-[#3d1e0f] text-amber-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Urutkan nama A-Z"
                >
                  🔤 A-Z
                </button>
              </div>
            </div>
          </div>

          {/* Menu Cards / Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold">Memuat rekap menu...</div>
          ) : soldMenuItemsSummary.items.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-slate-50/60 rounded-3xl p-8 border border-slate-100">
              <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                {menuSearchQuery ? `Tidak ada menu dengan kata kunci "${menuSearchQuery}"` : 'Belum ada menu terjual pada parameter tanggal ini'}
              </p>
              <p className="text-xs text-slate-400">
                {menuSearchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Silakan pilih parameter tanggal (Hari Ini, Kemarin, atau pilih tanggal) di atas.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {soldMenuItemsSummary.items.map((menu, index) => {
                const isTop3 = index < 3 && menuSortBy === 'qty_desc';
                return (
                  <div
                    key={menu.name}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-amber-200 hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            index === 0 && isTop3
                              ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                              : index === 1 && isTop3
                              ? 'bg-slate-300 text-slate-800 ring-2 ring-slate-200'
                              : index === 2 && isTop3
                              ? 'bg-amber-700/80 text-amber-100 ring-2 ring-amber-600/30'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          #{index + 1}
                        </span>

                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            {menu.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Dari {menu.transactionsCount} transaksi
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-base text-[#3d1e0f] font-mono block">
                          {menu.quantity} <span className="text-xs font-bold text-slate-600">Porsi</span>
                        </span>
                        {menu.totalRevenue > 0 && (
                          <span className="text-xs font-bold text-emerald-700 font-mono block">
                            {formatRupiah(menu.totalRevenue)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar (% of total) */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            index === 0
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                              : 'bg-gradient-to-r from-[#3d1e0f] to-amber-900'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, menu.percentage))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Kontribusi Penjualan:</span>
                        <span className="font-mono text-slate-600 font-bold">{menu.percentage}% dari total porsi</span>
                      </div>
                    </div>

                    {/* Variant Details if any */}
                    {Object.keys(menu.variants).length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/60 flex flex-wrap gap-1">
                        {Object.entries(menu.variants).map(([vName, vQty]) => (
                          <span
                            key={vName}
                            className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-700 font-semibold"
                          >
                            {vName}: <strong>{vQty}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Sales List Table */}
      {viewMode === 'transactions' && (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">Memuat data riwayat...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Receipt className="w-12 h-12 text-amber-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum Ada Transaksi Ditemukan</p>
            <p className="text-xs text-slate-400">Silakan ganti kata kunci atau pilih tanggal transaksi yang sesuai.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSales.map((tx) => (
              <div
                key={tx.id}
                className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">{tx.transaction_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        tx.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tx.status === 'completed' ? 'Berhasil' : 'Dibatalkan'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-amber-600" />
                      {tx.branch_name || 'Cabang'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {tx.seller_name || 'Kasir'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateTime(tx.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {tx.payment_method}
                    </p>
                    <p className="text-base font-extrabold text-[#3d1e0f]">{formatRupiah(tx.total_amount)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="p-2.5 rounded-xl bg-amber-100 text-[#3d1e0f] font-bold hover:bg-amber-200 transition-colors flex items-center gap-1"
                      title="Lihat Detail & Cetak Nota"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">Detail</span>
                    </button>

                    {tx.status === 'completed' && (isOwner || isAdminPusat) && (
                      <button
                        onClick={() => setTxToCancel(tx)}
                        className="p-2.5 rounded-xl bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition-colors"
                        title="Batalkan Transaksi"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {/* Hapus Transaksi Permanen (Akses Owner, Admin, dan Kasir) */}
                    <button
                      onClick={() => handleDeleteTransaction(tx)}
                      className="p-2.5 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors"
                      title="Hapus Transaksi Permanen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Detail Receipt Modal */}
      {selectedTx && (
        <ReceiptModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}

      {/* Cancellation Audit Reason Modal */}
      {txToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Ban className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">Pembatalan Transaksi</h3>
            </div>

            <p className="text-xs text-slate-600">
              Anda akan membatalkan transaksi <strong className="font-mono">{txToCancel.transaction_number}</strong> sebesar{' '}
              <strong className="text-[#3d1e0f]">{formatRupiah(txToCancel.total_amount)}</strong>. Tindakan ini akan dicatat dalam audit log.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">Alasan Pembatalan (Wajib)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Salah penginputan kasir / Pembeli batal pesan"
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setTxToCancel(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim() || isCancelling}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {isCancelling ? 'Proses...' : 'Konfirmasi Pembatalan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
