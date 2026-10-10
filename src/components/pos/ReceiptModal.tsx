'use client';

import React from 'react';
import { SaleTransaction } from '@/types';
import { formatRupiah, formatDateTime } from '@/lib/utils/formatters';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface ReceiptModalProps {
  transaction: SaleTransaction;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const { settings } = useApp();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-emerald-600 text-white p-4 text-center relative print:hidden">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1 rounded-full text-emerald-100 hover:text-white hover:bg-emerald-700"
          >
            <X className="w-5 h-5" />
          </button>
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-200 mb-1" />
          <h3 className="font-extrabold text-lg">Transaksi Berhasil!</h3>
          <p className="text-xs text-emerald-100 font-mono">{transaction.transaction_number}</p>
        </div>

        {/* Receipt Body (Formatted for Thermal Printers) */}
        <div id="receipt-print-area" className="p-6 overflow-y-auto bg-slate-50 font-mono text-xs text-slate-800 space-y-4">
          
          {/* Brand Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="font-extrabold text-sm uppercase text-slate-900">{settings.app_name}</h2>
            <p className="text-[10px] text-slate-500 font-sans">{settings.brand_owner}</p>
            <p className="text-[11px] font-bold text-slate-700 mt-1">{transaction.branch_name || 'Cabang'}</p>
          </div>

          {/* Info Meta */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Trx:</span>
              <span className="font-bold">{transaction.transaction_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waktu:</span>
              <span>{formatDateTime(transaction.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span>{transaction.seller_name || '-'}</span>
            </div>
          </div>

          {/* Item Breakdown */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            {transaction.items?.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{item.quantity}x {item.product_name_snapshot}</span>
                  <span>{formatRupiah(item.subtotal)}</span>
                </div>
                {item.variant_details_snapshot && item.variant_details_snapshot.length > 0 && (
                  <div className="text-[10px] text-slate-500 pl-3">
                    {item.variant_details_snapshot.map((v: any) => v.name).join(', ')}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 pl-3">
                  @ {formatRupiah(item.unit_price_snapshot)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Diskon</span>
                <span>-{formatRupiah(transaction.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1">
              <span>TOTAL</span>
              <span>{formatRupiah(transaction.total_amount)}</span>
            </div>
          </div>

          {/* Payment & Change Details */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Metode Pembayaran</span>
              <span className="uppercase font-bold">{transaction.payment_method}</span>
            </div>
            {transaction.payment_method === 'tunai' && (
              <>
                <div className="flex justify-between">
                  <span>Uang Tunai</span>
                  <span>{formatRupiah(transaction.cash_received)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Kembalian</span>
                  <span>{formatRupiah(transaction.cash_change)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 text-[10px] text-slate-500 font-sans border-t border-dashed border-slate-300">
            <p className="font-semibold text-slate-700">Terima kasih atas kunjungan Anda!</p>
            <p>Pancong Lumer Hangat & Melimpah 🥞✨</p>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Nota</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Transaksi Baru</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
