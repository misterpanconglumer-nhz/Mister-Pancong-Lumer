'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Expense, ExpenseCategory } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDate } from '@/lib/utils/formatters';
import { Wallet, Plus, CheckCircle2, Clock, XCircle, Store, Tag, FileText, Image as ImageIcon } from 'lucide-react';

export default function ExpensesPage() {
  const { user, activeBranch, isOwner, isAdminPusat, isAdminCabang } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('Bahan Baku');
  const [paymentMethod, setPaymentMethod] = useState<'kas_cabang' | 'uang_pribadi'>('kas_cabang');
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
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

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeBranch || !title.trim() || !amountInput) return;

    setIsSubmitting(true);
    try {
      await DataService.createExpense({
        branch_id: activeBranch.id,
        branch_name: activeBranch.name,
        category_name: categoryName,
        title,
        amount: Number(amountInput) || 0,
        payment_method: paymentMethod,
        notes,
        receipt_url: receiptUrl || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        created_by: user.id,
        created_by_name: user.full_name,
        status: isOwner ? 'approved' : 'pending',
        expense_date: new Date().toISOString().split('T')[0],
      });

      setShowAddModal(false);
      setTitle('');
      setAmountInput('');
      setNotes('');
      setReceiptUrl('');
      await fetchExpenses();
    } catch (err) {
      console.error('Failed to create expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (expenseId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    await DataService.updateExpenseStatus(expenseId, status, user.id);
    await fetchExpenses();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Pengeluaran Operasional</h1>
          <p className="text-xs text-slate-500 mt-0.5">Catatan biaya belanja bahan baku, kemasan & operasional cabang</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="py-3 px-5 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-lg shadow-brand-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengeluaran</span>
        </button>
      </div>

      {/* List Expenses */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat pengeluaran...</div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum Ada Pengeluaran</p>
            <p className="text-xs text-slate-400">Pengeluaran kas cabang akan tercatat di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{exp.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        exp.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exp.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {exp.status === 'approved'
                        ? 'Disetujui'
                        : exp.status === 'rejected'
                        ? 'Ditolak'
                        : 'Menunggu Persetujuan'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-brand-800">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      {exp.category_name || 'Umum'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      {exp.branch_name || 'Cabang'}
                    </span>
                    <span>Sumber: {exp.payment_method === 'kas_cabang' ? '💰 Kas Cabang' : '👤 Uang Pribadi Karyawan'}</span>
                    <span>Tanggal: {formatDate(exp.expense_date)}</span>
                  </div>

                  {exp.notes && <p className="text-xs text-slate-400 italic">"{exp.notes}"</p>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-base font-extrabold text-rose-600">{formatRupiah(exp.amount)}</p>
                    <p className="text-[10px] text-slate-400">Dicatat oleh: {exp.created_by_name}</p>
                  </div>

                  {exp.status === 'pending' && (isOwner || isAdminPusat || isAdminCabang) && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(exp.id, 'approved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs hover:bg-emerald-200"
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(exp.id, 'rejected')}
                        className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs hover:bg-rose-200"
                      >
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Catat Pengeluaran Baru</h3>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama / Keterangan Pengeluaran</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Beli 5kg Keju & 2 Bal Es Batu"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-brand-700 focus:outline-none"
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
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="Bahan Baku">Bahan Baku</option>
                    <option value="Kemasan">Kemasan</option>
                    <option value="Es & Bahan Tambahan">Es & Bahan Tambahan</option>
                    <option value="Transportasi Operasional">Transportasi Operasional</option>
                    <option value="Perlengkapan">Perlengkapan</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sumber Uang Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('kas_cabang')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      paymentMethod === 'kas_cabang'
                        ? 'bg-brand-900 text-amber-200 border-brand-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    💰 Uang Kas Cabang
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('uang_pribadi')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      paymentMethod === 'uang_pribadi'
                        ? 'bg-brand-900 text-amber-200 border-brand-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    👤 Uang Pribadi (Reimburse)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Beli di Toko Jaya Makmur"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-md"
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
