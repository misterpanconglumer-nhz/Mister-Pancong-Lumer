'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DailyReport, SaleTransaction, Expense } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDate } from '@/lib/utils/formatters';
import { ClipboardList, Plus, Printer, Calendar, Store, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function DailyReportsPage() {
  const { user, activeBranch, branches, isOwner, isAdminPusat, isAdminCabang } = useAuth();
  const { settings } = useApp();

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);

  // Raw data cache for fast recalculation
  const [rawSales, setRawSales] = useState<SaleTransaction[]>([]);
  const [rawExpenses, setRawExpenses] = useState<Expense[]>([]);

  // Parameter Filter: Hari / Bulan / Cabang
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [filterBranchId, setFilterBranchId] = useState<string>('all');

  // Form states for closing cash shift modal
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportBranchId, setReportBranchId] = useState<string>('');
  const [initialCash, setInitialCash] = useState<number>(100000);
  const [grossSales, setGrossSales] = useState<number>(0);
  const [totalTrxCount, setTotalTrxCount] = useState<number>(0);
  const [cashSales, setCashSales] = useState<number>(0);
  const [nonCashSales, setNonCashSales] = useState<number>(0);
  const [branchCashExpenses, setBranchCashExpenses] = useState<number>(0);
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const calculateMetrics = (
    targetDate: string,
    targetBranchId: string,
    sList: SaleTransaction[],
    eList: Expense[]
  ) => {
    const branchObj = branches.find((b) => b.id === targetBranchId) || activeBranch;

    const branchSales = sList.filter((s) => {
      const matchBranch = !targetBranchId || targetBranchId === 'all' || s.branch_id === targetBranchId;
      const matchDate = s.created_at.startsWith(targetDate);
      return s.status === 'completed' && matchBranch && matchDate;
    });

    const tGross = branchSales.reduce((sum, s) => sum + s.total_amount, 0);
    const tCash = branchSales
      .filter((s) => s.payment_method === 'tunai')
      .reduce((sum, s) => sum + s.total_amount, 0);
    const tNonCash = branchSales
      .filter((s) => s.payment_method !== 'tunai')
      .reduce((sum, s) => sum + s.total_amount, 0);

    const branchExpenses = eList
      .filter((e) => {
        const matchBranch = !targetBranchId || targetBranchId === 'all' || e.branch_id === targetBranchId;
        const matchDate = e.expense_date === targetDate;
        return matchBranch && matchDate && e.payment_method === 'kas_cabang' && e.status !== 'rejected';
      })
      .reduce((sum, e) => sum + e.amount, 0);

    setGrossSales(tGross);
    setTotalTrxCount(branchSales.length);
    setCashSales(tCash);
    setNonCashSales(tNonCash);
    setBranchCashExpenses(branchExpenses);
    setInitialCash(branchObj?.initial_cash_default || 100000);
  };

  const fetchReportsAndCalculate = async () => {
    setLoading(true);
    try {
      const [rList, sList, eList] = await Promise.all([
        DataService.getDailyReports(),
        DataService.getSales(),
        DataService.getExpenses(),
      ]);
      setReports(rList);
      setRawSales(sList);
      setRawExpenses(eList);

      const targetBranchId = reportBranchId || activeBranch?.id || (branches[0]?.id ?? 'd9ec11ac-c42f-4904-b932-20abbe83e89e');
      calculateMetrics(reportDate, targetBranchId, sList, eList);
    } catch (err) {
      console.error('Error fetching daily report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndCalculate();
  }, [activeBranch]);

  // When date or branch is changed inside the modal, recalculate automatically
  const handleModalDateChange = (newDate: string) => {
    setReportDate(newDate);
    const targetBranch = reportBranchId || activeBranch?.id || (branches[0]?.id ?? 'd9ec11ac-c42f-4904-b932-20abbe83e89e');
    calculateMetrics(newDate, targetBranch, rawSales, rawExpenses);
  };

  const handleModalBranchChange = (newBranchId: string) => {
    setReportBranchId(newBranchId);
    calculateMetrics(reportDate, newBranchId, rawSales, rawExpenses);
  };

  const handleOpenModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const targetBranch = activeBranch?.id || (branches[0]?.id ?? 'd9ec11ac-c42f-4904-b932-20abbe83e89e');
    setReportDate(today);
    setReportBranchId(targetBranch);
    setActualCashInput('');
    setReportNotes('');
    calculateMetrics(today, targetBranch, rawSales, rawExpenses);
    setShowFormModal(true);
  };

  const expectedCash = initialCash + cashSales - branchCashExpenses;
  const actualCashNum = Number(actualCashInput) || 0;
  const cashDiff = actualCashNum - expectedCash;

  // Filtered reports by Date / Month & Branch
  const filteredReports = reports.filter((r) => {
    if (filterBranchId !== 'all' && r.branch_id !== filterBranchId) return false;
    if (filterMode === 'date') {
      if (filterDate && r.report_date !== filterDate) return false;
    } else {
      if (filterMonth && !r.report_date.startsWith(filterMonth)) return false;
    }
    return true;
  });

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const targetBranchId = reportBranchId || activeBranch?.id || (branches[0]?.id ?? 'd9ec11ac-c42f-4904-b932-20abbe83e89e');
    const targetBranchObj = branches.find((b) => b.id === targetBranchId) || activeBranch;

    setIsSubmitting(true);
    try {
      const saved = await DataService.submitDailyReport({
        branch_id: targetBranchId,
        branch_name: targetBranchObj?.name || 'Cabang',
        report_date: reportDate,
        submitted_by: user.id,
        submitted_by_name: user.full_name,
        gross_sales: grossSales,
        total_transactions: totalTrxCount,
        cash_sales: cashSales,
        non_cash_sales: nonCashSales,
        branch_cash_expenses: branchCashExpenses,
        initial_cash_balance: initialCash,
        expected_cash: expectedCash,
        actual_cash: actualCashNum,
        cash_difference: cashDiff,
        notes: reportNotes,
        status: isOwner ? 'approved' : 'pending',
      });

      // Optimistic update
      setReports((prev) => {
        const filtered = prev.filter((r) => r.id !== saved.id);
        return [saved, ...filtered];
      });

      setShowFormModal(false);
      alert('✓ Laporan Harian & Tutup Kas berhasil disimpan!');
      await fetchReportsAndCalculate();
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
        await fetchReportsAndCalculate();
      } catch (err: any) {
        alert('Gagal menghapus laporan: ' + (err?.message || 'Terjadi kendala'));
      }
    }
  };

  const handleReviewReport = async (reportId: string, status: 'approved' | 'revision_requested') => {
    if (!user) return;
    await DataService.updateDailyReportStatus(reportId, status, user.id);
    await fetchReportsAndCalculate();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Laporan Harian & Tutup Kas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Rekapitulasi penjualan, penerimaan tunai, pengeluaran & rekonsiliasi kas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleOpenModal}
            className="py-3 px-5 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-lg shadow-[#3d1e0f]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Buat Laporan / Tutup Kas</span>
          </button>
        </div>
      </div>

      {/* Parameter Filter Bar: Tanggal / Bulan / Cabang */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Mode Switcher: Filter Tanggal vs Filter Bulan */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setFilterMode('date')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'date'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Filter Tanggal
            </button>
            <button
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
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {filterMode === 'date' ? (
            <>
              <div className="relative min-w-[150px]">
                <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                />
              </div>
              <button
                onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-[#3d1e0f] rounded-xl text-xs font-bold transition-colors"
                title="Tampilkan Laporan Hari Ini"
              >
                Hari Ini
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setFilterDate(d.toISOString().split('T')[0]);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                title="Tampilkan Laporan Kemarin"
              >
                Kemarin
              </button>
              <button
                onClick={() => setFilterDate('')}
                className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold"
                title="Tampilkan Semua Tanggal"
              >
                Tampilkan Semua
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Pilih Bulan:</span>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Printable Report List Container */}
      <div id="receipt-print-area" className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
        
        {/* Printable Header */}
        <div className="border-b border-dashed border-slate-300 pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 uppercase">{settings.app_name}</h2>
            <p className="text-xs text-slate-500">{settings.brand_owner}</p>
            <p className="text-xs font-bold text-[#3d1e0f] mt-1">LAPORAN TUTUP KAS HARIAN</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-slate-800">
              Periode: {filterMode === 'date' ? (filterDate ? formatDate(filterDate) : 'Semua Tanggal') : filterMonth}
            </p>
            <p className="text-[10px] text-slate-400">Total: {filteredReports.length} Laporan</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">Memuat laporan harian...</div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum Ada Laporan Pada Periode Ini</p>
            <p className="text-xs text-slate-400">Gunakan tombol "+ Buat Laporan / Tutup Kas" di atas untuk mencatat rekonsiliasi kas harian.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map((report) => (
              <div key={report.id} className="py-4 hover:bg-slate-50 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      Laporan Cabang {report.branch_name}
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
                      {report.status === 'approved'
                        ? 'Disetujui'
                        : report.status === 'revision_requested'
                        ? 'Perlu Revisi'
                        : 'Menunggu Pemeriksaan'}
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

                    {/* Hapus Laporan Harian */}
                    {(isOwner || isAdminPusat || isAdminCabang) && (
                      <button
                        onClick={() => handleDeleteReport(report.id, report.report_date)}
                        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Laporan Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                    <p className="text-[10px] text-slate-500 font-medium">Fisik Kas (Expected / Actual)</p>
                    <p className="font-extrabold text-slate-900 text-sm">
                      {formatRupiah(report.actual_cash)}
                    </p>
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

      {/* Submit Daily Report / Tutup Kas Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-slate-900">Form Laporan Harian & Tutup Kas Shift</h3>

            {/* Parameter Tanggal & Cabang Laporan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tanggal Tutup Kas</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => handleModalDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                />
              </div>

              {(isOwner || isAdminPusat) ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Cabang</label>
                  <select
                    value={reportBranchId}
                    onChange={(e) => handleModalBranchChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Cabang</label>
                  <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-800">
                    {activeBranch?.name || 'Cabang'}
                  </div>
                </div>
              )}
            </div>

            {/* Real-time calculated metrics box */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-1 text-xs">
              <p className="font-bold text-[#3d1e0f]">
                Rekap Otomatis ({formatDate(reportDate)}):
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                <div>Omzet Penjualan: <strong className="text-slate-900">{formatRupiah(grossSales)}</strong></div>
                <div>Jumlah Transaksi: <strong className="text-slate-900">{totalTrxCount} TRX</strong></div>
                <div>Penjualan Tunai: <strong className="text-emerald-700">{formatRupiah(cashSales)}</strong></div>
                <div>Non-Tunai (QRIS/Trf): <strong className="text-slate-900">{formatRupiah(nonCashSales)}</strong></div>
                <div>Pengeluaran Kas: <strong className="text-rose-700">{formatRupiah(branchCashExpenses)}</strong></div>
                <div>Kas Awal Shift: <strong className="text-slate-900">{formatRupiah(initialCash)}</strong></div>
              </div>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Kas Yang Diharapkan (Expected):</span>
                  <span className="font-bold font-mono text-amber-300">{formatRupiah(expectedCash)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Uang Tunai Fisik Aktual di Laci Kasir (Rp) *
                </label>
                <input
                  type="number"
                  required
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder="Masukkan jumlah fisik uang kertas/koin"
                  className="w-full px-3.5 py-3 border border-slate-300 rounded-2xl text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-[#3d1e0f] focus:outline-none"
                />
              </div>

              {actualCashInput !== '' && (
                <div className={`p-3 rounded-2xl text-xs font-bold ${cashDiff === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {cashDiff === 0
                    ? '✓ Uang kas pas & sesuai dengan laporan!'
                    : `⚠️ Terdapat selisih kas sebesar ${formatRupiah(cashDiff)}`}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Catatan Shift (Opsional)</label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Tulis catatan jika ada barang sisa atau selisih uang..."
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
                  {isSubmitting ? 'Menyimpan...' : 'Kirim Laporan Harian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
