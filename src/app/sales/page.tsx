'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SaleTransaction } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDateTime } from '@/lib/utils/formatters';
import { Search, Filter, Receipt, Ban, Eye, Printer, Calendar, Store, User } from 'lucide-react';
import ReceiptModal from '@/components/pos/ReceiptModal';

export default function SalesHistoryPage() {
  const { user, activeBranch, isOwner, isAdminPusat } = useAuth();

  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
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

  // Filter logic
  const filteredSales = sales.filter((s) => {
    // Seller only sees own branch or own sales if not owner/admin_pusat
    if (!isOwner && !isAdminPusat && activeBranch && s.branch_id !== activeBranch.id) {
      return false;
    }

    if (filterBranchId !== 'all' && s.branch_id !== filterBranchId) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTrxNum = s.transaction_number.toLowerCase().includes(q);
      const matchSeller = s.seller_name?.toLowerCase().includes(q);
      if (!matchTrxNum && !matchSeller) return false;
    }

    return true;
  });

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
          <p className="text-xs text-slate-500 mt-0.5">Daftar seluruh transaksi kasir & bukti pembayaran</p>
        </div>
        <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-brand-900 font-bold text-xs flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-600" />
          <span>Total Transaksi: {filteredSales.length}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor transaksi TRX-... atau nama kasir"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        {isOwner && (
          <div className="w-full md:w-48">
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="all">Semua Cabang</option>
              <option value="br-1">Cabang Cidodol</option>
              <option value="br-2">Cabang Blujami</option>
            </select>
          </div>
        )}
      </div>

      {/* Sales List Table / Card list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat data riwayat...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum Ada Transaksi</p>
            <p className="text-xs text-slate-400">Transaksi yang dilakukan kasir akan muncul di sini.</p>
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
                    <p className="text-base font-extrabold text-brand-900">{formatRupiah(tx.total_amount)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="p-2.5 rounded-xl bg-amber-100 text-brand-900 font-bold hover:bg-amber-200 transition-colors"
                      title="Lihat Detail & Cetak Nota"
                    >
                      <Eye className="w-4 h-4" />
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
              <strong className="text-brand-900">{formatRupiah(txToCancel.total_amount)}</strong>. Tindakan ini akan dicatat dalam audit log.
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
