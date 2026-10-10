'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SaleTransaction } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDateTime } from '@/lib/utils/formatters';
import { Search, Filter, Receipt, Ban, Eye, Printer, Calendar, Store, User, RotateCcw } from 'lucide-react';
import ReceiptModal from '@/components/pos/ReceiptModal';

export default function SalesHistoryPage() {
  const { user, activeBranch, isOwner, isAdminPusat } = useAuth();

  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<SaleTransaction | null>(null);

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
  }, []);

  // Preset Date Handlers
  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setFilterDate(today);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterBranchId('all');
    setFilterDate('');
  };

  // Filter logic
  const filteredSales = sales.filter((s) => {
    // Non-owner / non-admin only sees own branch
    if (!isOwner && !isAdminPusat && activeBranch && s.branch_id !== activeBranch.id) {
      return false;
    }

    if (filterBranchId !== 'all' && s.branch_id !== filterBranchId) {
      return false;
    }

    if (filterDate !== '') {
      const txDate = s.created_at.split('T')[0];
      if (txDate !== filterDate) return false;
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
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-xs">
            Omzet: {formatRupiah(totalOmzetFiltered)}
          </div>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
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
          <div className="relative md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-3.5" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
              />
            </div>
            <button
              onClick={handleSetToday}
              className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-[#3d1e0f] rounded-2xl text-xs font-extrabold shrink-0 transition-colors"
              title="Filter Transaksi Hari Ini"
            >
              Hari Ini
            </button>
          </div>

          {/* Branch Picker (Owner) */}
          {isOwner && (
            <div className="md:col-span-3">
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
              >
                <option value="all">Semua Cabang</option>
                <option value="br-1">Cabang Cidodol</option>
                <option value="br-2">Cabang Blujami</option>
              </select>
            </div>
          )}

        </div>

        {/* Active Filter Indicators */}
        {(filterDate || filterBranchId !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Filter Aktif:</span>
              {filterDate && <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-[#3d1e0f] font-mono font-bold">Tanggal: {filterDate}</span>}
              {filterBranchId !== 'all' && <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-[#3d1e0f] font-bold">Cabang: {filterBranchId}</span>}
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

      {/* Sales List Table */}
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
                        className="p-2.5 rounded-xl bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 transition-colors"
                        title="Batalkan Transaksi"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
