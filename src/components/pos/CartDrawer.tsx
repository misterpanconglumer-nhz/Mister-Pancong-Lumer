'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PaymentMethod, SaleTransaction } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, generateTrxNumber } from '@/lib/utils/formatters';
import { ShoppingBag, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface CartDrawerProps {
  onTransactionComplete: (transaction: SaleTransaction) => void;
  hideHeader?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onTransactionComplete, hideHeader = false }) => {
  const { cart, updateCartQuantity, removeFromCart, clearCart, cartSubtotal, cartTotalCount } = useApp();
  const { user, activeBranch } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const discount = Math.max(0, Number(discountInput) || 0);
  const totalAmount = Math.max(0, cartSubtotal - discount);

  const cashReceivedNum = Number(cashReceivedInput) || 0;
  const cashChange = paymentMethod === 'tunai' ? Math.max(0, cashReceivedNum - totalAmount) : 0;

  const quickNominals = [
    { label: 'Uang Pas', value: totalAmount },
    { label: '20rb', value: 20000 },
    { label: '50rb', value: 50000 },
    { label: '100rb', value: 100000 },
  ];

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!user) {
      setErrorMsg('Pengguna belum login.');
      return;
    }
    if (!activeBranch) {
      setErrorMsg('Pilih cabang aktif terlebih dahulu.');
      return;
    }

    if (paymentMethod === 'tunai' && cashReceivedNum < totalAmount) {
      setErrorMsg(`Uang tunai kurang! Kurang ${formatRupiah(totalAmount - cashReceivedNum)}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const trxNumber = generateTrxNumber(activeBranch.code || 'MPL');
      
      const newTransaction: Omit<SaleTransaction, 'id' | 'created_at'> = {
        transaction_number: trxNumber,
        branch_id: activeBranch.id,
        branch_name: activeBranch.name,
        seller_id: user.id,
        seller_name: user.full_name,
        subtotal: cartSubtotal,
        discount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'tunai' ? cashReceivedNum : totalAmount,
        cash_change: cashChange,
        status: 'completed',
        items: cart.map((item) => ({
          product_id: item.product.id,
          product_name_snapshot: item.product.name,
          variant_details_snapshot: item.selected_variants,
          unit_price_snapshot: item.unit_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
      };

      const savedTrx = await DataService.createTransaction(newTransaction);
      clearCart();
      setCashReceivedInput('');
      onTransactionComplete(savedTrx);
    } catch (err: any) {
      console.error('Transaction error:', err);
      setErrorMsg('Gagal memproses transaksi: ' + (err.message || 'Error tidak diketahui'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col h-full overflow-hidden">
      
      {/* Cart Header (shown on desktop or when hideHeader is false) */}
      {!hideHeader && (
        <div className="p-4 bg-brand-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">Keranjang Belanja</h2>
            {cartTotalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-brand-900">
                {cartTotalCount} item
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-amber-300 hover:text-white underline font-medium transition-colors"
            >
              Kosongkan
            </button>
          )}
        </div>
      )}

      {/* Sub-header when hideHeader is true */}
      {hideHeader && cart.length > 0 && (
        <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-700">Item Pesanan ({cartTotalCount})</span>
          <button
            onClick={clearCart}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline"
          >
            Kosongkan Keranjang
          </button>
        </div>
      )}

      {/* Scrollable Middle Area: holds Cart Items AND Payment Options */}
      <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-4 min-h-0">
        {cart.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Keranjang Masih Kosong</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Pilih menu pancong & minuman bergambar di samping untuk menambahkan ke keranjang.
            </p>
          </div>
        ) : (
          <>
            {/* List of Cart Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.cart_item_id} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">{item.product.name}</p>

                    {item.selected_variants.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selected_variants.map((v) => (
                          <span
                            key={v.variant_id}
                            className="px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-900 text-[10px] font-medium"
                          >
                            {v.name} {v.additional_price > 0 ? `(+${formatRupiah(v.additional_price)})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs font-bold text-brand-800 mt-1">
                      {formatRupiah(item.unit_price)} x {item.quantity} = {formatRupiah(item.subtotal)}
                    </p>
                  </div>

                  {/* Quantity Controls & Delete */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => updateCartQuantity(item.cart_item_id, -1)}
                      className="w-6 h-6 rounded-lg bg-white text-slate-700 flex items-center justify-center shadow-xs hover:bg-slate-200"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.cart_item_id, 1)}
                      className="w-6 h-6 rounded-lg bg-brand-700 text-white flex items-center justify-center shadow-xs hover:bg-brand-800"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.cart_item_id)}
                      className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-100 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Configuration Options */}
            <div className="pt-3 space-y-3.5">
              {/* Subtotal & Diskon */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(cartSubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Diskon</span>
                    <span className="font-semibold">-{formatRupiah(discount)}</span>
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'tunai', label: 'Tunai', icon: Banknote },
                    { id: 'qris', label: 'QRIS', icon: QrCode },
                    { id: 'transfer', label: 'Transfer', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-brand-700 bg-brand-900 text-amber-200 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Received & Change Calculation for Tunai */}
              {paymentMethod === 'tunai' && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Uang Diterima (Rp)</label>
                    {cashReceivedNum >= totalAmount && (
                      <span className="text-xs font-bold text-emerald-700">
                        Kembalian: {formatRupiah(cashChange)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={cashReceivedInput}
                    onChange={(e) => setCashReceivedInput(e.target.value)}
                    placeholder="Masukkan nominal uang diterima"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />

                  {/* Quick Nominal Chips */}
                  <div className="flex gap-1.5 overflow-x-auto pt-1">
                    {quickNominals.map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => setCashReceivedInput(String(q.value))}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 text-brand-900 font-bold text-[11px] whitespace-nowrap hover:bg-amber-200"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom Footer: Always Visible & Easily Clickable! */}
      {cart.length > 0 && (
        <div className="shrink-0 p-3.5 sm:p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] space-y-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pembayaran</span>
            <span className="text-lg sm:text-xl font-black text-[#3d1e0f]">{formatRupiah(totalAmount)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="w-full py-3.5 sm:py-4 px-5 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-extrabold text-sm sm:text-base shadow-xl shadow-brand-900/30 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses Transaksi...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Selesaikan Transaksi ({formatRupiah(totalAmount)})</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};

export default CartDrawer;
