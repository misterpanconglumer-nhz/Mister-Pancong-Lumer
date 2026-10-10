'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PayrollItem, PayrollSetting, UserProfile, CustomPayrollComponent } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDate } from '@/lib/utils/formatters';
import { Banknote, Settings, Lock, CheckCircle2, Eye, Plus, Trash2, Printer, Calendar, FileText, Download, Building2, User, Award, ShieldCheck, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function PayrollPage() {
  const { user, isOwner, isAdminPusat } = useAuth();
  const { settings } = useApp();

  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSetting[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');

  // Selected item modal state
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [editingSettingUser, setEditingSettingUser] = useState<PayrollSetting | null>(null);

  // Form state for updating employee payroll settings
  const [baseSalary, setBaseSalary] = useState<string>('1500000');
  const [baseSalaryType, setBaseSalaryType] = useState<'monthly' | 'per_day' | 'per_shift'>('monthly');
  const [transport, setTransport] = useState<string>('25000');
  const [transportType, setTransportType] = useState<'monthly' | 'per_day' | 'manual'>('per_day');
  const [meal, setMeal] = useState<string>('25000');
  const [mealType, setMealType] = useState<'monthly' | 'per_day' | 'manual'>('per_day');
  const [commission, setCommission] = useState<string>('1.5');
  const [bonusRule, setBonusRule] = useState<string>('Target omzet > 10 Juta');

  // Custom components (e.g. Uang Baju, Bonus, etc.)
  const [customComponents, setCustomComponents] = useState<CustomPayrollComponent[]>([
    { id: 'cc-1', name: 'Uang Seragam Baju', amount: 100000, type: 'bonus' },
  ]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const [items, settingsList, userList] = await Promise.all([
        DataService.getPayrollItems(),
        DataService.getPayrollSettings(),
        DataService.getUsers(),
      ]);
      setPayrollItems(items);
      setPayrollSettings(settingsList);
      setEmployees(userList.filter((u) => u.role === 'penjual' || u.role === 'admin_cabang'));
    } catch (err) {
      console.error('Error fetching payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  if (!isOwner && !isAdminPusat) {
    return (
      <div className="py-16 text-center space-y-3 bg-white rounded-3xl p-8 border border-slate-100 max-w-md mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500">
          Menu Penggajian hanya dapat diakses oleh Owner dan Admin Pusat berwenang.
        </p>
      </div>
    );
  }

  const handleOpenSettingModal = (emp: UserProfile) => {
    const existing = payrollSettings.find((s) => s.user_id === emp.id);
    if (existing) {
      setEditingSettingUser(existing);
      setBaseSalary(String(existing.base_salary));
      setBaseSalaryType(existing.base_salary_type);
      setTransport(String(existing.transport_allowance));
      setTransportType(existing.transport_type || 'per_day');
      setMeal(String(existing.meal_allowance));
      setMealType(existing.meal_type || 'per_day');
      setCommission(String(existing.sales_commission_rate));
      setBonusRule(existing.bonus_rule || '');
      setCustomComponents(existing.custom_components || [
        { id: `cc-${Date.now()}`, name: 'Uang Seragam Baju', amount: 100000, type: 'bonus' },
      ]);
    } else {
      setEditingSettingUser({
        id: `ps-${emp.id}`,
        user_id: emp.id,
        user_name: emp.full_name,
        base_salary: 1500000,
        base_salary_type: 'monthly',
        transport_allowance: 25000,
        transport_type: 'per_day',
        meal_allowance: 25000,
        meal_type: 'per_day',
        sales_commission_rate: 1.5,
      });
      setBaseSalary('1500000');
      setBaseSalaryType('monthly');
      setTransport('25000');
      setTransportType('per_day');
      setMeal('25000');
      setMealType('per_day');
      setCommission('1.5');
      setBonusRule('Target omzet');
      setCustomComponents([
        { id: `cc-${Date.now()}`, name: 'Uang Seragam Baju', amount: 100000, type: 'bonus' },
      ]);
    }
  };

  const handleAddCustomComponent = () => {
    setCustomComponents([
      ...customComponents,
      { id: `cc-${Date.now()}`, name: '', amount: 0, type: 'bonus' },
    ]);
  };

  const handleRemoveCustomComponent = (id: string) => {
    setCustomComponents(customComponents.filter((c) => c.id !== id));
  };

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSettingUser) return;

    const validCustomComponents = customComponents.filter((c) => c.name.trim() !== '');

    await DataService.savePayrollSetting({
      user_id: editingSettingUser.user_id,
      user_name: editingSettingUser.user_name,
      base_salary: Number(baseSalary) || 0,
      base_salary_type: baseSalaryType,
      transport_allowance: Number(transport) || 0,
      transport_type: transportType,
      meal_allowance: Number(meal) || 0,
      meal_type: mealType,
      custom_components: validCustomComponents,
      sales_commission_rate: Number(commission) || 0,
      bonus_rule: bonusRule,
    });

    setEditingSettingUser(null);
    await fetchPayrollData();
  };

  const handleApprovePayroll = async (item: PayrollItem) => {
    await DataService.savePayrollItem({
      ...item,
      status: 'approved',
    });
    await fetchPayrollData();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Laporan & Rekap Penggajian</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-brand-900 text-[10px] font-bold">Khusus Owner</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Pengaturan kompensasi, poin bonus/baju, cetak slip gaji resmi & ekspor PDF</p>
        </div>

        {/* Filter Month & Export PDF button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={handlePrintPDF}
            className="py-2.5 px-4 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-md flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Section 1: Employee Salary Components Settings */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 print:hidden">
        <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-600" />
          <span>Pengaturan Komponen Gaji Karyawan (Transport Manual & Poin Bonus/Baju)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {employees.map((emp) => {
            const setting = payrollSettings.find((s) => s.user_id === emp.id);
            return (
              <div
                key={emp.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">{emp.full_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium capitalize">{emp.role.replace('_', ' ')}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold text-brand-800 mt-1">
                    <span>Gaji Pokok: {formatRupiah(setting?.base_salary || 0)}</span>
                    <span>Transport: {formatRupiah(setting?.transport_allowance || 0)}</span>
                    {setting?.custom_components && setting.custom_components.length > 0 && (
                      <span className="text-emerald-700 font-bold">
                        +{setting.custom_components.length} Poin Bonus/Baju
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenSettingModal(emp)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-brand-900 font-bold text-xs hover:bg-amber-600 transition-colors shadow-xs"
                >
                  Atur Gaji & Poin
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Printable Report Table */}
      <div id="payroll-report-area" className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
        
        {/* Printable Header */}
        <div className="border-b border-dashed border-slate-300 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 p-1 shadow-md flex items-center justify-center font-bold text-brand-900 text-xl">
              {settings.logo_url && !settings.logo_url.includes('placeholder') ? (
                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span>PL</span>
              )}
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 uppercase">{settings.app_name}</h2>
              <p className="text-xs text-slate-500">{settings.brand_owner}</p>
              <p className="text-xs font-bold text-brand-900 mt-0.5">REKAPITULASI LAPORAN PENGGAJIAN KARYAWAN</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-slate-800">Periode: {selectedMonth}</p>
            <p className="text-[10px] text-slate-400">Tanggal Cetak: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat data penggajian...</div>
        ) : payrollItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">Belum ada slip gaji yang diproses.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payrollItems.map((item) => {
              const setting = payrollSettings.find((s) => s.user_id === item.user_id);
              const customBonusSum = (setting?.custom_components || [])
                .filter((c) => c.type === 'bonus')
                .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
              
              const calculatedNet = item.net_salary + customBonusSum;

              return (
                <div
                  key={item.id}
                  className="py-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{item.user_name}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status === 'approved' ? 'Disetujui Owner' : 'Draft Slip Gaji'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono">
                      <span>Presensi: <strong>{item.days_present} Hari</strong></span>
                      <span>Pokok: {formatRupiah(item.base_salary_calculated)}</span>
                      <span>Transport: {formatRupiah(item.transport_calculated)}</span>
                      <span>Makan: {formatRupiah(item.meal_calculated)}</span>
                      {customBonusSum > 0 && (
                        <span className="text-emerald-700 font-bold">
                          +Poin Tambahan: {formatRupiah(customBonusSum)}
                        </span>
                      )}
                    </div>

                    {setting?.custom_components && setting.custom_components.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {setting.custom_components.map((c) => (
                          <span
                            key={c.id}
                            className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold"
                          >
                            + {c.name}: {formatRupiah(c.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">GAJI BERSIH (NET)</p>
                      <p className="text-base font-extrabold text-emerald-700 font-mono">{formatRupiah(calculatedNet)}</p>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        onClick={() => setSelectedPayroll({ ...item, net_salary: calculatedNet, custom_components: setting?.custom_components })}
                        className="px-3 py-1.5 rounded-xl bg-amber-100 text-brand-900 font-bold text-xs hover:bg-amber-200 flex items-center gap-1.5 transition-colors"
                        title="Lihat & Cetak Slip Gaji Resmimu"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span>Cetak Slip Gaji</span>
                      </button>

                      {item.status === 'draft' && isOwner && (
                        <button
                          onClick={() => handleApprovePayroll(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                        >
                          Setujui Gaji
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Setting Modal - Manual Transport & Poin Komponen Gajian */}
      {editingSettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-900">
              Pengaturan Komponen Gaji: {editingSettingUser.user_name}
            </h3>

            <form onSubmit={handleSaveSetting} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gaji Pokok (Rp)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-xs font-bold text-slate-900"
                  />
                  <select
                    value={baseSalaryType}
                    onChange={(e) => setBaseSalaryType(e.target.value as any)}
                    className="px-3 py-2 border rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="monthly">Tetap / Bulan</option>
                    <option value="per_day">Per Hari Hadir</option>
                    <option value="per_shift">Per Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Uang Transportasi (Manual / Setting)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    placeholder="25000"
                    className="px-3 py-2 border rounded-xl text-xs font-bold text-slate-900"
                  />
                  <select
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value as any)}
                    className="px-3 py-2 border rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="per_day">Per Hari Hadir</option>
                    <option value="monthly">Tetap per Bulan</option>
                    <option value="manual">Manual Override</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Uang Makan (Rp)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={meal}
                    onChange={(e) => setMeal(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-xs font-bold text-slate-900"
                  />
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as any)}
                    className="px-3 py-2 border rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="per_day">Per Hari Hadir</option>
                    <option value="monthly">Tetap per Bulan</option>
                    <option value="manual">Manual Override</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Poin Tambahan Gajian (Baju, Bonus, Tunjangan)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCustomComponent}
                    className="text-xs text-brand-800 font-bold hover:underline"
                  >
                    + Tambah Poin
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {customComponents.map((c, idx) => (
                    <div key={c.id || idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nama poin (e.g. Uang Baju)"
                        value={c.name}
                        onChange={(e) => {
                          const updated = [...customComponents];
                          updated[idx].name = e.target.value;
                          setCustomComponents(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 border rounded-lg text-xs font-semibold"
                      />
                      <input
                        type="number"
                        placeholder="Nominal (Rp)"
                        value={c.amount}
                        onChange={(e) => {
                          const updated = [...customComponents];
                          updated[idx].amount = Number(e.target.value) || 0;
                          setCustomComponents(updated);
                        }}
                        className="w-28 px-2 py-1.5 border rounded-lg text-xs font-bold text-emerald-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomComponent(c.id)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSettingUser(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-md"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Beautiful Pay Slip Modal & Printable Document */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[95vh] flex flex-col">
            
            {/* Modal Top Control Bar (Hidden when printing) */}
            <div className="p-3 bg-brand-900 text-white flex items-center justify-between print:hidden">
              <span className="font-bold text-xs tracking-wider uppercase text-amber-300">Pratinjau Slip Gaji Resmi</span>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="p-1 rounded-lg text-amber-200 hover:bg-brand-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Gaji Content (Formatted for Screen & Printable PDF Document) */}
            <div id="receipt-print-area" className="p-6 md:p-8 bg-white text-slate-800 space-y-6 overflow-y-auto">
              
              {/* Header Company & Logo */}
              <div className="flex items-center justify-between border-b-2 border-brand-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 p-1 shadow-lg flex items-center justify-center font-bold text-brand-900 text-2xl">
                    {settings.logo_url && !settings.logo_url.includes('placeholder') ? (
                      <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span>PL</span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg md:text-xl text-brand-900 tracking-tight leading-none uppercase">
                      {settings.app_name}
                    </h2>
                    <p className="text-xs font-semibold text-amber-700 mt-1">{settings.brand_owner}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Spesialis Pancong Lumer & Minuman Segar</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-900 text-amber-300 font-extrabold text-xs tracking-wider uppercase">
                    SLIP GAJI
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-1.5">Periode: {selectedMonth}</p>
                </div>
              </div>

              {/* Employee & Document Meta Info Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Karyawan</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedPayroll.user_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cabang Penugasan</span>
                  <span className="font-bold text-brand-900">{selectedPayroll.branch_name || 'Cidodol'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Kehadiran</span>
                  <span className="font-bold text-slate-800">{selectedPayroll.days_present} Hari Kerja Verified</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Dokumen</span>
                  <span className="font-bold text-emerald-700">✓ Disetujui & Resmi</span>
                </div>
              </div>

              {/* Itemized Compensation Table */}
              <div className="space-y-3">
                <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                  Rincian Penerimaan & Komponen Gaji
                </p>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase text-left">
                      <th className="py-1 font-bold">Komponen Gaji</th>
                      <th className="py-1 font-bold text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    <tr>
                      <td className="py-2.5">Gaji Pokok</td>
                      <td className="py-2.5 text-right font-mono font-bold">{formatRupiah(selectedPayroll.base_salary_calculated)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5">Uang Transportasi Operasional</td>
                      <td className="py-2.5 text-right font-mono font-bold">{formatRupiah(selectedPayroll.transport_calculated)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5">Uang Makan Harian</td>
                      <td className="py-2.5 text-right font-mono font-bold">{formatRupiah(selectedPayroll.meal_calculated)}</td>
                    </tr>

                    {/* Custom Components breakdown */}
                    {selectedPayroll.custom_components?.map((c, idx) => (
                      <tr key={idx} className="bg-emerald-50/50">
                        <td className="py-2.5 text-emerald-900 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{c.name}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-800">
                          +{formatRupiah(c.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Highlight Net Salary Summary Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-900 to-amber-950 text-white flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">Total Gaji Bersih (Netto)</p>
                  <p className="text-xs text-slate-300">Telah ditransfer / diserahkan tunai</p>
                </div>
                <div className="text-right">
                  <p className="text-xl md:text-2xl font-black font-mono text-amber-300">
                    {formatRupiah(selectedPayroll.net_salary)}
                  </p>
                </div>
              </div>

              {/* Signatures & Approval Area */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Penerima Gaji,</p>
                  <div className="h-14 flex items-end justify-center">
                    <span className="border-b border-slate-400 w-32 inline-block font-bold text-slate-900">
                      ( {selectedPayroll.user_name} )
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">Owner / Management,</p>
                  <div className="h-14 flex items-end justify-center">
                    <span className="border-b border-slate-400 w-32 inline-block font-bold text-slate-900">
                      ( Hj. Nafa )
                    </span>
                  </div>
                </div>
              </div>

              {/* Watermark / Footer */}
              <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-dashed border-slate-200">
                <p>Dokumen Resmi Slip Gaji Mister Pancong Lumer • By Manage Nafa Family</p>
              </div>

            </div>

            {/* Action Control Buttons (Print / Close) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 print:hidden">
              <button
                onClick={handlePrintPDF}
                className="flex-1 py-3.5 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print PDF Slip Gaji</span>
              </button>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="py-3.5 px-6 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
