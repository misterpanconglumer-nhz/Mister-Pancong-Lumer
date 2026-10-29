'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PayrollItem, PayrollSetting, UserProfile, CustomPayrollComponent, AttendanceRecord } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah, formatDate } from '@/lib/utils/formatters';
import { toBlob, toPng } from 'html-to-image';
import {
  Banknote,
  Settings,
  Lock,
  CheckCircle2,
  Eye,
  Plus,
  Trash2,
  Printer,
  Calendar,
  FileText,
  Download,
  Building2,
  User,
  Award,
  ShieldCheck,
  X,
  Calculator,
  Clock,
  Check,
  Sparkles,
  Receipt,
  Store,
  Camera,
  Share2,
  Save,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatMonthOnly(dateOrPeriod?: string): string {
  if (!dateOrPeriod) return '';
  const match = dateOrPeriod.match(/(\d{4})-(\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m >= 1 && m <= 12) {
      return `${MONTH_NAMES_ID[m - 1]} ${y}`;
    }
  }
  for (const mName of MONTH_NAMES_ID) {
    if (dateOrPeriod.toLowerCase().includes(mName.toLowerCase())) {
      const yMatch = dateOrPeriod.match(/\b(20\d\d)\b/);
      return yMatch ? `${mName} ${yMatch[1]}` : mName;
    }
  }
  return dateOrPeriod.replace(/^Periode\s*:?\s*/i, '').trim();
}

function getPayrollCutoffRange(yearMonth: string, cycle: 'curr_to_next' | 'prev_to_curr' = 'curr_to_next') {
  const [yStr, mStr] = yearMonth.split('-');
  const y = parseInt(yStr, 10) || new Date().getFullYear();
  const m = parseInt(mStr, 10) || (new Date().getMonth() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');

  if (cycle === 'curr_to_next') {
    // 26 bulan sekarang s/d 25 bulan besok (sesuai permintaan user)
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    const startDate = `${y}-${pad(m)}-26`;
    const endDate = `${nextY}-${pad(nextM)}-25`;
    const monthLabel = `${MONTH_NAMES_ID[m - 1]} ${y}`;
    const rangeText = `26 ${MONTH_NAMES_ID[m - 1].slice(0, 3)} - 25 ${MONTH_NAMES_ID[nextM - 1].slice(0, 3)} ${nextY}`;
    return { startDate, endDate, monthLabel, rangeText, cycle };
  } else {
    // 26 bulan lalu s/d 25 bulan sekarang
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const startDate = `${prevY}-${pad(prevM)}-26`;
    const endDate = `${y}-${pad(m)}-25`;
    const monthLabel = `${MONTH_NAMES_ID[m - 1]} ${y}`;
    const rangeText = `26 ${MONTH_NAMES_ID[prevM - 1].slice(0, 3)} - 25 ${MONTH_NAMES_ID[m - 1].slice(0, 3)} ${y}`;
    return { startDate, endDate, monthLabel, rangeText, cycle };
  }
}

function countAttendanceDays(
  empId: string,
  empName: string,
  startDate: string,
  endDate: string,
  attendanceRecords: AttendanceRecord[]
): { count: number; matchedRecords: AttendanceRecord[] } {
  const normName = (empName || '').toLowerCase().trim();
  const matched = attendanceRecords.filter((att) => {
    if (!att.date) return false;
    const isUser = att.user_id === empId || (att.user_name && att.user_name.toLowerCase().trim() === normName);
    if (!isUser) return false;
    const inRange = att.date >= startDate && att.date <= endDate;
    if (!inRange) return false;
    const isHadir = att.status === 'hadir' || Boolean(att.clock_in);
    return isHadir;
  });

  return {
    count: matched.length,
    matchedRecords: matched,
  };
}

interface ManualBonusItem {
  id: string;
  name: string;
  mode: 'fixed' | 'multiplier';
  rate: number;
  qty: number;
  unit: string;
  total: number;
}

interface ManualDeductionItem {
  id: string;
  name: string;
  amount: number;
}

export default function PayrollPage() {
  const { user, isOwner, isAdminPusat, branches, activeBranch } = useAuth();
  const { settings } = useApp();

  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSetting[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tab Utama: 'history' (Riwayat Slip Gaji) vs 'settings' (Tarif Standar Karyawan)
  const [activeMainTab, setActiveMainTab] = useState<'history' | 'settings'>('history');

  // Success notification toast
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filters & Cut-off Periode (Default: 26 bulan sekarang s/d 25 bulan besok)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [cutoffCycle, setCutoffCycle] = useState<'curr_to_next' | 'prev_to_curr'>('curr_to_next');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');

  // Perhitungan rentang cutoff aktif
  const currentCutoff = useMemo(() => {
    return getPayrollCutoffRange(selectedMonth, cutoffCycle);
  }, [selectedMonth, cutoffCycle]);

  // Selected item modal state for pay slip preview
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [editingSettingUser, setEditingSettingUser] = useState<PayrollSetting | null>(null);
  const [isCopyingImage, setIsCopyingImage] = useState<boolean>(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState<boolean>(false);

  // Form state for updating employee payroll settings
  const [baseSalary, setBaseSalary] = useState<string>('1500000');
  const [baseSalaryType, setBaseSalaryType] = useState<'monthly' | 'per_day' | 'per_shift'>('monthly');
  const [transport, setTransport] = useState<string>('15000');
  const [transportType, setTransportType] = useState<'monthly' | 'per_day' | 'manual'>('per_day');
  const [meal, setMeal] = useState<string>('15000');
  const [mealType, setMealType] = useState<'monthly' | 'per_day' | 'manual'>('per_day');
  const [commission, setCommission] = useState<string>('1.5');
  const [bonusRule, setBonusRule] = useState<string>('Target omzet > 10 Juta');

  // Custom components (e.g. Uang Baju, Bonus, etc.)
  const [customComponents, setCustomComponents] = useState<CustomPayrollComponent[]>([
    { id: 'cc-1', name: 'Uang Seragam Baju', amount: 100000, type: 'bonus' },
  ]);

  // ==========================================
  // STATE: PEMBUATAN SLIP GAJI MANUAL
  // ==========================================
  const [showManualSlipModal, setShowManualSlipModal] = useState<boolean>(false);
  const [manualEmployeeType, setManualEmployeeType] = useState<'existing' | 'custom'>('existing');
  const [manualEmployeeId, setManualEmployeeId] = useState<string>('');
  const [manualEmployeeName, setManualEmployeeName] = useState<string>('');
  const [manualBranchId, setManualBranchId] = useState<string>('');
  const [manualBranchName, setManualBranchName] = useState<string>('');
  const [manualPeriodLabel, setManualPeriodLabel] = useState<string>('');
  const [manualDaysPresent, setManualDaysPresent] = useState<number>(24);

  // Gaji Pokok
  const [baseMode, setBaseMode] = useState<'fixed' | 'daily'>('fixed');
  const [baseFixedAmount, setBaseFixedAmount] = useState<number>(1500000);
  const [baseDailyRate, setBaseDailyRate] = useState<number>(60000);
  const [baseDays, setBaseDays] = useState<number>(24);

  // Uang Makan (Perkalian)
  const [mealRate, setMealRate] = useState<number>(15000);
  const [mealDays, setMealDays] = useState<number>(24);

  // Uang Transport (Perkalian)
  const [transportRate, setTransportRate] = useState<number>(15000);
  const [transportDays, setTransportDays] = useState<number>(24);

  // Lembur Mingguan / Jam (Perkalian)
  const [enableOvertime, setEnableOvertime] = useState<boolean>(true);
  const [overtimeTitle, setOvertimeTitle] = useState<string>('Lembur Mingguan');
  const [overtimeRate, setOvertimeRate] = useState<number>(25000);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState<number>(4);
  const [overtimeUnit, setOvertimeUnit] = useState<string>('minggu');

  // Bonus Tambahan
  const [manualBonuses, setManualBonuses] = useState<ManualBonusItem[]>([
    { id: 'b-1', name: 'Bonus Target / Kerajinan', mode: 'fixed', rate: 100000, qty: 1, unit: 'kali', total: 100000 },
  ]);

  // Potongan (Kasbon / Izin)
  const [manualDeductions, setManualDeductions] = useState<ManualDeductionItem[]>([]);
  const [manualNotes, setManualNotes] = useState<string>('');
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const [items, settingsList, userList, allAttendance] = await Promise.all([
        DataService.getPayrollItems(),
        DataService.getPayrollSettings(),
        DataService.getUsers(),
        DataService.getAttendance(),
      ]);
      setPayrollItems(items);
      setPayrollSettings(settingsList);
      setEmployees(userList.filter((u) => u.role === 'penjual' || u.role === 'admin_cabang' || u.role === 'owner'));
      setAttendanceList(allAttendance || []);
    } catch (err) {
      console.error('Error fetching payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  // Filtered Payroll Items (Riwayat Slip Gaji)
  const filteredPayrollItems = useMemo(() => {
    return payrollItems.filter((item) => {
      if (filterBranchId !== 'all' && item.branch_id && item.branch_id !== filterBranchId) {
        return false;
      }
      return true;
    });
  }, [payrollItems, filterBranchId]);

  // Total summary calculation for history view
  const totalNetSalaryAll = useMemo(() => {
    return filteredPayrollItems.reduce((sum, item) => sum + (Number(item.net_salary) || 0), 0);
  }, [filteredPayrollItems]);

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

  // ==========================================
  // HANDLERS: PENGATURAN KOMPONEN GAJI DEFAULT
  // ==========================================
  const handleOpenSettingModal = (emp: UserProfile) => {
    const existing = payrollSettings.find((s) => s.user_id === emp.id);
    if (existing) {
      setEditingSettingUser(existing);
      setBaseSalary(String(existing.base_salary));
      setBaseSalaryType(existing.base_salary_type);
      setTransport(String(existing.transport_allowance || 15000));
      setTransportType(existing.transport_type || 'per_day');
      setMeal(String(existing.meal_allowance || 15000));
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
        transport_allowance: 15000,
        transport_type: 'per_day',
        meal_allowance: 15000,
        meal_type: 'per_day',
        sales_commission_rate: 1.5,
      });
      setBaseSalary('1500000');
      setBaseSalaryType('monthly');
      setTransport('15000');
      setTransportType('per_day');
      setMeal('15000');
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
    setSaveSuccessMsg('✓ Pengaturan tarif standar gaji berhasil disimpan!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeletePayroll = async (itemId: string, name?: string) => {
    if (window.confirm(`Hapus slip gaji untuk ${name || 'karyawan ini'} dari riwayat?`)) {
      await DataService.deletePayrollItem(itemId);
      setPayrollItems((prev) => prev.filter((i) => i.id !== itemId));
      if (selectedPayroll?.id === itemId) setSelectedPayroll(null);
      setSaveSuccessMsg(`✓ Slip gaji untuk ${name || 'karyawan'} berhasil dihapus dari riwayat.`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  // ==========================================
  // HANDLERS: PEMBUATAN SLIP GAJI MANUAL
  // ==========================================
  const handleOpenManualSlipModal = (prefillEmp?: UserProfile) => {
    const targetEmp = prefillEmp || employees[0];
    const attResult = targetEmp
      ? countAttendanceDays(targetEmp.id, targetEmp.full_name, currentCutoff.startDate, currentCutoff.endDate, attendanceList)
      : { count: 0 };
    const initialDays = attResult.count > 0 ? attResult.count : 24;

    setManualEmployeeType('existing');
    setManualEmployeeId(targetEmp?.id || 'emp-1');
    setManualEmployeeName(targetEmp?.full_name || 'Karyawan');
    setManualBranchId(activeBranch?.id || branches[0]?.id || 'd9ec11ac-c42f-4904-b932-20abbe83e89e');
    setManualBranchName(activeBranch?.name || branches[0]?.name || 'Cidodol');
    setManualPeriodLabel(currentCutoff.monthLabel); // Format Bulan Saja (e.g. Oktober 2026)
    setManualDaysPresent(initialDays);

    // Look up existing payroll setting if available
    const setting = targetEmp ? payrollSettings.find((s) => s.user_id === targetEmp.id) : null;

    if (setting) {
      if (setting.base_salary_type === 'per_day') {
        setBaseMode('daily');
        setBaseDailyRate(setting.base_salary || 60000);
        setBaseDays(initialDays);
        setBaseFixedAmount(setting.base_salary * initialDays);
      } else {
        setBaseMode('fixed');
        setBaseFixedAmount(setting.base_salary || 1500000);
        setBaseDailyRate(Math.round((setting.base_salary || 1500000) / initialDays));
        setBaseDays(initialDays);
      }

      setMealRate(setting.meal_allowance || 15000);
      setMealDays(initialDays);
      setTransportRate(setting.transport_allowance || 15000);
      setTransportDays(initialDays);

      if (setting.custom_components && setting.custom_components.length > 0) {
        setManualBonuses(
          setting.custom_components.map((c, i) => ({
            id: `b-${i}-${Date.now()}`,
            name: c.name,
            mode: 'fixed',
            rate: c.amount,
            qty: 1,
            unit: 'kali',
            total: c.amount,
          }))
        );
      } else {
        setManualBonuses([
          { id: 'b-1', name: 'Bonus Target / Kerajinan', mode: 'fixed', rate: 100000, qty: 1, unit: 'kali', total: 100000 },
        ]);
      }
    } else {
      setBaseMode('fixed');
      setBaseFixedAmount(1500000);
      setBaseDailyRate(60000);
      setBaseDays(initialDays);
      setMealRate(15000);
      setMealDays(initialDays);
      setTransportRate(15000);
      setTransportDays(initialDays);
      setManualBonuses([
        { id: 'b-1', name: 'Bonus Target / Kerajinan', mode: 'fixed', rate: 100000, qty: 1, unit: 'kali', total: 100000 },
      ]);
    }

    setEnableOvertime(true);
    setOvertimeTitle('Lembur Mingguan');
    setOvertimeRate(25000);
    setOvertimeMultiplier(4);
    setOvertimeUnit('minggu');
    setManualDeductions([]);
    setManualNotes('');
    setShowManualSlipModal(true);
  };

  // DUPLIKAT / SALIN DATA SLIP KE FORM SLIP BARU
  const handleDuplicateSlip = (item: PayrollItem) => {
    const snap = item.snapshot_data;
    const days = item.days_present || 24;

    setManualEmployeeType('existing');
    setManualEmployeeId(item.user_id || 'emp-1');
    setManualEmployeeName(item.user_name || 'Karyawan');
    setManualBranchId(item.branch_id || activeBranch?.id || branches[0]?.id || '');
    setManualBranchName(item.branch_name || activeBranch?.name || branches[0]?.name || 'Cidodol');
    setManualPeriodLabel(snap?.period_label || currentCutoff.monthLabel);
    setManualDaysPresent(days);

    // Gaji Pokok
    if (snap?.base_salary?.mode === 'daily') {
      setBaseMode('daily');
      setBaseDailyRate(snap.base_salary.rate || 60000);
      setBaseDays(snap.base_salary.days || days);
      setBaseFixedAmount((snap.base_salary.rate || 60000) * (snap.base_salary.days || days));
    } else {
      setBaseMode('fixed');
      setBaseFixedAmount(item.base_salary_calculated || 1500000);
      setBaseDailyRate(days > 0 ? Math.round(item.base_salary_calculated / days) : 60000);
      setBaseDays(days);
    }

    // Uang Makan
    const deducedMealRate = snap?.meal?.rate || (days > 0 ? Math.round(item.meal_calculated / days) : 15000);
    const deducedMealDays = snap?.meal?.days || days;
    setMealRate(deducedMealRate);
    setMealDays(deducedMealDays);

    // Uang Transport
    const deducedTransportRate = snap?.transport?.rate || (days > 0 ? Math.round(item.transport_calculated / days) : 15000);
    const deducedTransportDays = snap?.transport?.days || days;
    setTransportRate(deducedTransportRate);
    setTransportDays(deducedTransportDays);

    // Lembur
    if (snap?.overtime) {
      setEnableOvertime(true);
      setOvertimeTitle(snap.overtime.title || 'Lembur Mingguan');
      setOvertimeRate(snap.overtime.rate || 25000);
      setOvertimeMultiplier(snap.overtime.multiplier || 4);
      setOvertimeUnit(snap.overtime.unit || 'minggu');
    } else {
      const otComponent = item.custom_components?.find((c) => c.name.toLowerCase().includes('lembur'));
      if (otComponent) {
        setEnableOvertime(true);
        setOvertimeTitle(otComponent.name);
        setOvertimeRate(otComponent.amount);
        setOvertimeMultiplier(1);
        setOvertimeUnit('kali');
      } else {
        setEnableOvertime(false);
      }
    }

    // Bonus Tambahan
    if (snap?.bonuses && snap.bonuses.length > 0) {
      setManualBonuses(snap.bonuses);
    } else {
      const existingBonuses = (item.custom_components || [])
        .filter((c) => c.type === 'bonus' && !c.name.toLowerCase().includes('lembur'))
        .map((c, i) => ({
          id: `b-${i}-${Date.now()}`,
          name: c.name,
          mode: 'fixed' as const,
          rate: c.amount,
          qty: 1,
          unit: 'kali',
          total: c.amount,
        }));
      setManualBonuses(
        existingBonuses.length > 0
          ? existingBonuses
          : [{ id: 'b-1', name: 'Bonus Target / Kerajinan', mode: 'fixed', rate: 100000, qty: 1, unit: 'kali', total: 100000 }]
      );
    }

    // Potongan Gaji
    if (snap?.deductions && snap.deductions.length > 0) {
      setManualDeductions(snap.deductions);
    } else {
      const existingDeductions = (item.custom_components || [])
        .filter((c) => c.type === 'deduction')
        .map((c, i) => ({
          id: `d-${i}-${Date.now()}`,
          name: c.name,
          amount: c.amount,
        }));
      setManualDeductions(existingDeductions);
    }

    setManualNotes(snap?.notes || '');
    setSelectedPayroll(null);
    setShowManualSlipModal(true);
  };

  const handleSelectEmployeeForManual = (empId: string) => {
    if (empId === 'custom') {
      setManualEmployeeType('custom');
      setManualEmployeeId(`custom-${Date.now()}`);
      setManualEmployeeName('');
      return;
    }

    setManualEmployeeType('existing');
    setManualEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setManualEmployeeName(emp.full_name);
      
      // Otomatis hitung hari hadir dari absensi untuk karyawan ini
      const attResult = countAttendanceDays(emp.id, emp.full_name, currentCutoff.startDate, currentCutoff.endDate, attendanceList);
      const daysToUse = attResult.count > 0 ? attResult.count : manualDaysPresent;
      handleSyncDays(daysToUse);

      const setting = payrollSettings.find((s) => s.user_id === emp.id);
      if (setting) {
        if (setting.base_salary_type === 'per_day') {
          setBaseMode('daily');
          setBaseDailyRate(setting.base_salary);
          setBaseDays(daysToUse);
        } else {
          setBaseMode('fixed');
          setBaseFixedAmount(setting.base_salary);
        }
        if (setting.meal_allowance) setMealRate(setting.meal_allowance);
        if (setting.transport_allowance) setTransportRate(setting.transport_allowance);
      }
    }
  };

  // Sinkronisasi manual dari database absensi
  const handleSyncAttendanceForManual = (targetEmpId?: string, targetEmpName?: string) => {
    const eId = targetEmpId || manualEmployeeId;
    const eName = targetEmpName || manualEmployeeName;
    const attResult = countAttendanceDays(eId, eName, currentCutoff.startDate, currentCutoff.endDate, attendanceList);

    if (attResult.count > 0) {
      handleSyncDays(attResult.count);
      setSaveSuccessMsg(`✓ Berhasil memuat data absensi: ${attResult.count} hari hadir (${currentCutoff.startDate} s/d ${currentCutoff.endDate})`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } else {
      alert(`Belum ditemukan rekaman absensi terverifikasi untuk karyawan "${eName}" pada rentang cut-off: ${currentCutoff.startDate} s/d ${currentCutoff.endDate}.\n\nJumlah kehadiran tetap menggunakan isian manual (${manualDaysPresent} hari).`);
    }
  };

  // Sync days present with meal & transport days
  const handleSyncDays = (days: number) => {
    setManualDaysPresent(days);
    setMealDays(days);
    setTransportDays(days);
    if (baseMode === 'daily') {
      setBaseDays(days);
    }
  };

  // Live calculations for manual slip
  const calcBaseTotal = baseMode === 'fixed' ? Number(baseFixedAmount) || 0 : (Number(baseDailyRate) || 0) * (Number(baseDays) || 0);
  const calcMealTotal = (Number(mealRate) || 0) * (Number(mealDays) || 0);
  const calcTransportTotal = (Number(transportRate) || 0) * (Number(transportDays) || 0);
  const calcOvertimeTotal = enableOvertime ? (Number(overtimeRate) || 0) * (Number(overtimeMultiplier) || 0) : 0;
  const calcBonusTotal = manualBonuses.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  const calcGrossTotal = calcBaseTotal + calcMealTotal + calcTransportTotal + calcOvertimeTotal + calcBonusTotal;
  const calcDeductionsTotal = manualDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const calcNetTotal = Math.max(0, calcGrossTotal - calcDeductionsTotal);

  // Bonus items helpers
  const handleAddManualBonus = () => {
    setManualBonuses([
      ...manualBonuses,
      { id: `b-${Date.now()}`, name: 'Bonus Tambahan', mode: 'fixed', rate: 50000, qty: 1, unit: 'kali', total: 50000 },
    ]);
  };

  const handleUpdateManualBonus = (index: number, updates: Partial<ManualBonusItem>) => {
    const copy = [...manualBonuses];
    const item = { ...copy[index], ...updates };
    if (item.mode === 'multiplier') {
      item.total = (Number(item.rate) || 0) * (Number(item.qty) || 0);
    } else {
      item.total = Number(item.rate) || 0;
    }
    copy[index] = item;
    setManualBonuses(copy);
  };

  const handleRemoveManualBonus = (id: string) => {
    setManualBonuses(manualBonuses.filter((b) => b.id !== id));
  };

  // Deduction helpers
  const handleAddManualDeduction = () => {
    setManualDeductions([
      ...manualDeductions,
      { id: `d-${Date.now()}`, name: 'Potongan Kasbon / Lainnya', amount: 50000 },
    ]);
  };

  const handleUpdateManualDeduction = (index: number, updates: Partial<ManualDeductionItem>) => {
    const copy = [...manualDeductions];
    copy[index] = { ...copy[index], ...updates };
    setManualDeductions(copy);
  };

  const handleRemoveManualDeduction = (id: string) => {
    setManualDeductions(manualDeductions.filter((d) => d.id !== id));
  };

  // ==========================================
  // FITUR 1 TOMBOL COPY GAMBAR SLIP GAJI KE CLIPBOARD (UNTUK WHATSAPP)
  // ==========================================
  const handleCopySlipImage = async () => {
    const node = document.getElementById('receipt-print-area');
    if (!node) {
      alert('Area slip gaji tidak ditemukan.');
      return;
    }

    setIsCopyingImage(true);
    try {
      // 1. Render element into PNG blob with 2x pixel ratio for crystal clear text
      const blob = await toBlob(node, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      if (!blob) throw new Error('Gagal merender gambar slip');

      let copiedToClipboard = false;

      // 2. Direct Clipboard Item writing (works on Chrome, Edge, Safari desktop & WA Web)
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          copiedToClipboard = true;
        } catch (clipErr) {
          console.warn('Direct ClipboardItem write error:', clipErr);
        }
      }

      if (copiedToClipboard) {
        setCopyImageSuccess(true);
        setSaveSuccessMsg('✓ Gambar slip gaji tersalin ke Clipboard! Silakan buka WhatsApp dan tekan Ctrl+V (Tempel).');
        setTimeout(() => setCopyImageSuccess(false), 4500);
        setTimeout(() => setSaveSuccessMsg(null), 4500);
      } else {
        // Fallback: download PNG image automatically if clipboard writing is blocked by browser permissions
        const dataUrl = await toPng(node, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        const cleanName = (selectedPayroll?.user_name || 'karyawan').replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `Slip_Gaji_${cleanName}_${selectedMonth}.png`;
        link.href = dataUrl;
        link.click();
        setSaveSuccessMsg('✓ Gambar slip gaji otomatis diunduh! Anda bisa langsung melampirkannya di WhatsApp.');
        setTimeout(() => setSaveSuccessMsg(null), 4500);
      }
    } catch (err: any) {
      console.error('Error in handleCopySlipImage:', err);
      alert('Gagal menyalin gambar slip: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsCopyingImage(false);
    }
  };

  // ==========================================
  // FITUR HITUNG GAJI OTOMATIS DARI DATA ABSENSI
  // ==========================================
  const handleAutoCalculateAllFromAttendance = async () => {
    const confirmed = window.confirm(
      `Hitung gaji otomatis seluruh karyawan berdasarkan rekaman data absensi terverifikasi?\n\n` +
      `Periode: ${currentCutoff.monthLabel} (${currentCutoff.rangeText})\n` +
      `Rentang Tanggal: ${currentCutoff.startDate} s/d ${currentCutoff.endDate}`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const generatedSlips: PayrollItem[] = [];

      for (const emp of employees) {
        const setting = payrollSettings.find((s) => s.user_id === emp.id);
        const attResult = countAttendanceDays(emp.id, emp.full_name, currentCutoff.startDate, currentCutoff.endDate, attendanceList);
        
        // Use verified attendance days, fallback to 24 if no attendance clocked yet
        const days = attResult.count > 0 ? attResult.count : 24;

        const baseDailyRate = setting?.base_salary_type === 'per_day' ? (setting.base_salary || 60000) : 60000;
        const baseSalaryCalculated = setting?.base_salary_type === 'per_day'
          ? baseDailyRate * days
          : (setting?.base_salary || 1500000);

        const mealRate = setting?.meal_allowance || 15000;
        const mealTotal = mealRate * days;

        const transportRate = setting?.transport_allowance || 15000;
        const transportTotal = transportRate * days;

        const customBonuses = (setting?.custom_components || []).filter((c) => c.type === 'bonus');
        const bonusTotal = customBonuses.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        const customDeductions = (setting?.custom_components || []).filter((c) => c.type === 'deduction');
        const deductionTotal = customDeductions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        const gross = baseSalaryCalculated + mealTotal + transportTotal + bonusTotal;
        const net = Math.max(0, gross - deductionTotal);

        const slipPayload: Partial<PayrollItem> = {
          id: `slip-${emp.id}-${selectedMonth}`,
          payroll_period_id: `pp-${selectedMonth}`,
          user_id: emp.id,
          user_name: emp.full_name,
          branch_id: (emp as any).branch_id || activeBranch?.id || branches[0]?.id || 'd9ec11ac-c42f-4904-b932-20abbe83e89e',
          branch_name: (emp as any).branch_name || activeBranch?.name || branches[0]?.name || 'Cidodol',
          days_present: days,
          base_salary_calculated: baseSalaryCalculated,
          transport_calculated: transportTotal,
          meal_calculated: mealTotal,
          bonus_amount: bonusTotal,
          sales_incentive_amount: 0,
          total_deductions: deductionTotal,
          net_salary: net,
          status: 'approved',
          custom_components: setting?.custom_components || [],
          snapshot_data: {
            is_manual: false,
            is_auto_attendance: true,
            period_label: currentCutoff.monthLabel,
            cutoff_range: currentCutoff.rangeText,
            cutoff_start: currentCutoff.startDate,
            cutoff_end: currentCutoff.endDate,
            base_salary: {
              mode: setting?.base_salary_type === 'per_day' ? 'daily' : 'fixed',
              rate: baseDailyRate,
              days: days,
              total: baseSalaryCalculated,
            },
            meal: {
              rate: mealRate,
              days: days,
              total: mealTotal,
            },
            transport: {
              rate: transportRate,
              days: transportDays,
              total: transportTotal,
            },
            bonuses: customBonuses.map((b) => ({
              id: b.id,
              name: b.name,
              mode: 'fixed' as const,
              rate: b.amount,
              qty: 1,
              unit: 'kali',
              total: b.amount,
            })),
            deductions: customDeductions.map((d) => ({
              id: d.id,
              name: d.name,
              amount: d.amount,
            })),
            notes: `Dihitung otomatis dari absensi (${currentCutoff.rangeText})`,
          },
        };

        const saved = await DataService.savePayrollItem(slipPayload);
        generatedSlips.push(saved);
      }

      await fetchPayrollData();
      setSaveSuccessMsg(`✓ Berhasil menghitung & menyimpan slip gaji otomatis untuk ${generatedSlips.length} karyawan (${currentCutoff.monthLabel})!`);
      setTimeout(() => setSaveSuccessMsg(null), 4500);
    } catch (err: any) {
      console.error('Failed auto calculating payroll:', err);
      alert('Gagal menghitung gaji otomatis: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  };

  // Submit and Save Manual Slip
  const handleSubmitManualSlip = async (e: React.FormEvent, andOpenPreview: boolean = true) => {
    e.preventDefault();
    if (!manualEmployeeName.trim()) {
      alert('Nama karyawan wajib diisi!');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const targetBranchObj = branches.find((b) => b.id === manualBranchId) || activeBranch;

      const formattedCustomComponents: CustomPayrollComponent[] = [
        ...(enableOvertime && calcOvertimeTotal > 0
          ? [
              {
                id: `ot-${Date.now()}`,
                name: `${overtimeTitle} (${formatRupiah(overtimeRate)} x ${overtimeMultiplier} ${overtimeUnit})`,
                amount: calcOvertimeTotal,
                type: 'bonus' as const,
              },
            ]
          : []),
        ...manualBonuses
          .filter((b) => b.name.trim() !== '' && b.total > 0)
          .map((b) => ({
            id: b.id,
            name:
              b.mode === 'multiplier'
                ? `${b.name} (${formatRupiah(b.rate)} x ${b.qty} ${b.unit})`
                : b.name,
            amount: b.total,
            type: 'bonus' as const,
          })),
        ...manualDeductions
          .filter((d) => d.name.trim() !== '' && d.amount > 0)
          .map((d) => ({
            id: d.id,
            name: d.name,
            amount: d.amount,
            type: 'deduction' as const,
          })),
      ];

      const newSlipPayload: Partial<PayrollItem> = {
        id: `slip-${Date.now()}`,
        payroll_period_id: `pp-${selectedMonth}`,
        user_id: manualEmployeeId || `emp-${Date.now()}`,
        user_name: manualEmployeeName.trim(),
        branch_id: manualBranchId || targetBranchObj?.id,
        branch_name: targetBranchObj?.name || manualBranchName || 'Cidodol',
        days_present: manualDaysPresent,
        base_salary_calculated: calcBaseTotal,
        transport_calculated: calcTransportTotal,
        meal_calculated: calcMealTotal,
        bonus_amount: calcOvertimeTotal + calcBonusTotal,
        sales_incentive_amount: 0,
        total_deductions: calcDeductionsTotal,
        net_salary: calcNetTotal,
        status: 'approved',
        custom_components: formattedCustomComponents,
        snapshot_data: {
          is_manual: true,
          period_label: formatMonthOnly(manualPeriodLabel || currentCutoff.monthLabel),
          cutoff_range: currentCutoff.rangeText,
          cutoff_start: currentCutoff.startDate,
          cutoff_end: currentCutoff.endDate,
          base_salary: {
            mode: baseMode,
            rate: baseDailyRate,
            days: baseDays,
            total: calcBaseTotal,
          },
          meal: {
            rate: mealRate,
            days: mealDays,
            total: calcMealTotal,
          },
          transport: {
            rate: transportRate,
            days: transportDays,
            total: calcTransportTotal,
          },
          overtime: enableOvertime
            ? {
                title: overtimeTitle,
                rate: overtimeRate,
                multiplier: overtimeMultiplier,
                unit: overtimeUnit,
                total: calcOvertimeTotal,
              }
            : null,
          bonuses: manualBonuses,
          deductions: manualDeductions,
          notes: manualNotes,
        },
      };

      const saved = await DataService.savePayrollItem(newSlipPayload);
      setPayrollItems((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)]);
      setShowManualSlipModal(false);
      setActiveMainTab('history'); // Otomatis pindah ke Tab Riwayat Slip Gaji!

      if (andOpenPreview) {
        setSelectedPayroll(saved);
      } else {
        setSaveSuccessMsg(`✓ Slip gaji untuk ${manualEmployeeName.trim()} berhasil disimpan ke Riwayat Penggajian!`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to create manual payroll slip:', err);
      alert('Gagal membuat slip gaji: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Toast Notification Alert */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-100 text-[#3d1e0f]">
              <Banknote className="w-5 h-5 stroke-[2.5]" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Laporan & Riwayat Penggajian</h1>
              <p className="text-xs text-slate-500 mt-0.5">Pembuatan slip manual, simpan riwayat gaji, cetak PDF & fitur copy slip</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Buat Slip Manual */}
          <button
            onClick={() => handleOpenManualSlipModal()}
            className="py-2.5 px-4 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-extrabold text-xs shadow-md shadow-[#3d1e0f]/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Buat Slip Gaji Manual</span>
          </button>

          {/* Tombol Hitung Otomatis Seluruh Karyawan (Dari Absensi) */}
          <button
            onClick={handleAutoCalculateAllFromAttendance}
            className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            title="Hitung & simpan slip gaji otomatis seluruh karyawan berdasarkan absensi terverifikasi"
          >
            <Zap className="w-4 h-4 text-emerald-200 fill-emerald-200" />
            <span>⚡ Hitung Otomatis dari Absensi</span>
          </button>

          {/* Pemilih Periode Bulan Saja & Cutoff */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 leading-none">Periode Bulan</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-900 focus:outline-none"
              />
            </div>
            
            {/* Cut-off Toggle (26 - 25) */}
            <div className="hidden sm:flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 ml-1 text-[10px]">
              <button
                type="button"
                onClick={() => setCutoffCycle('curr_to_next')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  cutoffCycle === 'curr_to_next'
                    ? 'bg-[#3d1e0f] text-amber-200 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cut-off 26 bulan ini s/d 25 bulan besok"
              >
                26 Skrg - 25 Bsk
              </button>
              <button
                type="button"
                onClick={() => setCutoffCycle('prev_to_curr')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  cutoffCycle === 'prev_to_curr'
                    ? 'bg-[#3d1e0f] text-amber-200 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cut-off 26 bulan lalu s/d 25 bulan ini"
              >
                26 Lalu - 25 Ini
              </button>
            </div>
          </div>

          <button
            onClick={handlePrintPDF}
            className="py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tab Switcher: Riwayat Slip Gaji vs Pengaturan Tarif Standar */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveMainTab('history')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeMainTab === 'history'
                ? 'bg-white text-[#3d1e0f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-700" />
            <span>📋 Riwayat Slip Gaji Tersimpan ({filteredPayrollItems.length})</span>
          </button>
          <button
            onClick={() => setActiveMainTab('settings')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeMainTab === 'settings'
                ? 'bg-white text-[#3d1e0f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>⚙️ Pengaturan Tarif Standar ({employees.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-bold pr-2">
          <span>Total Akumulasi Gaji:</span>
          <span className="font-mono text-emerald-700 font-black text-sm">
            {formatRupiah(totalNetSalaryAll)}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: RIWAYAT SLIP GAJI TERSIMPAN (PRIMARY VIEW) */}
      {/* ======================================================== */}
      {activeMainTab === 'history' && (
        <div className="space-y-4">
          
          {/* Quick Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-4 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">Total Gaji Bersih (Netto)</span>
              <span className="text-xl sm:text-2xl font-black font-mono mt-1 block">{formatRupiah(totalNetSalaryAll)}</span>
              <span className="text-[11px] text-emerald-200 mt-1 block">Tercatat di riwayat sistem</span>
            </div>

            <div className="bg-gradient-to-br from-[#3d1e0f] to-amber-950 text-white p-4 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">Jumlah Slip Gaji Tersimpan</span>
              <span className="text-xl sm:text-2xl font-black font-mono mt-1 block">{filteredPayrollItems.length} Dokumen</span>
              <span className="text-[11px] text-amber-300 mt-1 block">Bisa dicetak & di-copy ke WA</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Buat Slip Gaji Baru</span>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">Dengan perkalian Makan, Transport & Lembur</p>
              </div>
              <button
                onClick={() => handleOpenManualSlipModal()}
                className="mt-2 w-full py-2 bg-amber-100 hover:bg-amber-200 text-[#3d1e0f] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Buat Slip Manual Baru</span>
              </button>
            </div>
          </div>

          {/* Table / List of Saved Slips */}
          <div id="payroll-report-area" className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
            
            {/* Printable Header */}
            <div className="border-b border-dashed border-slate-300 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black border border-amber-500/40 p-1 shadow-md flex items-center justify-center font-bold text-white text-xl overflow-hidden shrink-0">
                  <img
                    src={settings.logo_url || '/logo.jpg'}
                    alt="Logo"
                    className="w-full h-full object-contain rounded-xl"
                    onError={(e) => {
                      e.currentTarget.src = '/logo.jpg';
                    }}
                  />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-slate-900 uppercase">{settings.app_name}</h2>
                  <p className="text-xs text-slate-500">{settings.brand_owner}</p>
                  <p className="text-xs font-bold text-[#3d1e0f] mt-0.5">DAFTAR RIWAYAT SLIP GAJI KARYAWAN</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-slate-800">Periode: {formatMonthOnly(selectedMonth)}</p>
                <p className="text-[10px] text-slate-400">Cut-off: {currentCutoff.rangeText} • Total: {filteredPayrollItems.length} Slip Tersimpan</p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Memuat data riwayat slip gaji...</div>
            ) : filteredPayrollItems.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Belum ada slip gaji yang disimpan di riwayat</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Semua slip gaji yang dibuat melalui tombol "+ Buat Slip Gaji Manual" otomatis tersimpan di sini.
                </p>
                <button
                  onClick={() => handleOpenManualSlipModal()}
                  className="px-4 py-2.5 bg-[#3d1e0f] text-amber-100 rounded-xl text-xs font-bold hover:bg-amber-950 transition-colors shadow-sm"
                >
                  + Buat Slip Gaji Sekarang
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPayrollItems.map((item) => {
                  const isManualSlip = Boolean(item.snapshot_data?.is_manual);
                  const customBonusSum = (item.custom_components || [])
                    .filter((c) => c.type === 'bonus')
                    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
                  const customDeductionSum = (item.custom_components || [])
                    .filter((c) => c.type === 'deduction')
                    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

                  const calculatedNet = item.net_salary || (item.base_salary_calculated + item.transport_calculated + item.meal_calculated + customBonusSum - customDeductionSum);

                  return (
                    <div
                      key={item.id}
                      className="py-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                            {item.status === 'approved' ? '✓ Disetujui' : 'Draft'}
                          </span>
                          {isManualSlip && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              Perkalian Manual
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            ({item.branch_name || 'Cabang'})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono">
                          <span>Presensi: <strong>{item.days_present} Hari</strong></span>
                          <span>Pokok: {formatRupiah(item.base_salary_calculated)}</span>
                          <span>Makan: {formatRupiah(item.meal_calculated)}</span>
                          <span>Transport: {formatRupiah(item.transport_calculated)}</span>
                          {item.bonus_amount > 0 && (
                            <span className="text-emerald-700 font-bold">
                              +Lembur/Bonus: {formatRupiah(item.bonus_amount)}
                            </span>
                          )}
                          {item.total_deductions > 0 && (
                            <span className="text-rose-700 font-bold">
                              -Potongan: {formatRupiah(item.total_deductions)}
                            </span>
                          )}
                        </div>

                        {item.custom_components && item.custom_components.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.custom_components.map((c, idx) => (
                              <span
                                key={c.id || idx}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  c.type === 'bonus'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}
                              >
                                {c.type === 'bonus' ? '+' : '-'} {c.name}: {formatRupiah(c.amount)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">GAJI BERSIH (NETTO)</p>
                          <p className="text-base font-black text-emerald-700 font-mono">{formatRupiah(calculatedNet)}</p>
                        </div>

                        <div className="flex items-center gap-1.5 print:hidden">
                          {/* Tombol Lihat & Copy Gambar Slip */}
                          <button
                            onClick={() => setSelectedPayroll(item)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                            title="Buka Slip & Copy Gambar untuk WhatsApp"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-200" />
                            <span>📸 Copy Gambar Slip</span>
                          </button>

                          {/* Tombol Hapus */}
                          <button
                            onClick={() => handleDeletePayroll(item.id, item.user_name)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Hapus slip gaji ini dari riwayat"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PENGATURAN TARIF STANDAR KARYAWAN */}
      {/* ======================================================== */}
      {activeMainTab === 'settings' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-600" />
              <span>Pengaturan Tarif Standar Gaji Karyawan</span>
            </h2>
            <span className="text-xs text-slate-400">Tarif default saat membuat slip</span>
          </div>

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
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold text-slate-700 mt-1">
                      <span>Pokok: {formatRupiah(setting?.base_salary || 0)}</span>
                      <span>Transport: {formatRupiah(setting?.transport_allowance || 15000)}</span>
                      <span>Makan: {formatRupiah(setting?.meal_allowance || 15000)}</span>
                      {setting?.custom_components && setting.custom_components.length > 0 && (
                        <span className="text-emerald-700 font-bold">
                          +{setting.custom_components.length} Poin Bonus
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenManualSlipModal(emp)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-amber-300 font-bold text-xs transition-colors shadow-xs"
                      title="Buat slip manual untuk karyawan ini"
                    >
                      + Buat Slip
                    </button>
                    <button
                      onClick={() => handleOpenSettingModal(emp)}
                      className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition-colors shadow-xs"
                      title="Atur tarif dasar"
                    >
                      Atur
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FORM PEMBUATAN SLIP GAJI MANUAL DENGAN PERKALIAN */}
      {/* ======================================================== */}
      {showManualSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#3d1e0f] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Form Pembuatan Slip Gaji Manual
                  </h3>
                  <p className="text-[11px] text-amber-200/90">
                    Masukan perkalian Gaji Pokok, Uang Makan, Transport, Lembur Mingguan & Bonus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualSlipModal(false)}
                className="p-1 rounded-full text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form
              onSubmit={(e) => handleSubmitManualSlip(e, true)}
              className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-800"
            >
              
              {/* 1. Identitas Karyawan & Periode */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  1. Identitas Karyawan & Cabang
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pilihan Karyawan */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Pilih Karyawan *</label>
                    <select
                      value={manualEmployeeType === 'existing' ? manualEmployeeId : 'custom'}
                      onChange={(e) => handleSelectEmployeeForManual(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.role})
                        </option>
                      ))}
                      <option value="custom">+ Nama Lain / Karyawan Baru (Input Manual)</option>
                    </select>
                  </div>

                  {/* Input Nama Karyawan Manual jika Custom */}
                  {manualEmployeeType === 'custom' ? (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Nama Lengkap Karyawan *</label>
                      <input
                        type="text"
                        required
                        value={manualEmployeeName}
                        onChange={(e) => setManualEmployeeName(e.target.value)}
                        placeholder="Masukkan nama karyawan..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Cabang Penugasan</label>
                      <select
                        value={manualBranchId}
                        onChange={(e) => {
                          setManualBranchId(e.target.value);
                          const b = branches.find((br) => br.id === e.target.value);
                          if (b) setManualBranchName(b.name);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            Cabang {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Periode Gaji (Bulan Saja)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formatMonthOnly(manualPeriodLabel || currentCutoff.monthLabel)}
                        onChange={(e) => setManualPeriodLabel(e.target.value)}
                        placeholder="e.g. Oktober 2026"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
                      />
                    </div>
                    {/* Cut-off info & cycle toggle */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold">
                        Cut-off: <strong>{currentCutoff.rangeText}</strong>
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCutoffCycle('curr_to_next');
                            const nextCutoff = getPayrollCutoffRange(selectedMonth, 'curr_to_next');
                            setManualPeriodLabel(nextCutoff.monthLabel);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                            cutoffCycle === 'curr_to_next' ? 'bg-[#3d1e0f] text-amber-200 shadow-xs' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          26 Skrg - 25 Bsk
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCutoffCycle('prev_to_curr');
                            const nextCutoff = getPayrollCutoffRange(selectedMonth, 'prev_to_curr');
                            setManualPeriodLabel(nextCutoff.monthLabel);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                            cutoffCycle === 'prev_to_curr' ? 'bg-[#3d1e0f] text-amber-200 shadow-xs' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          26 Lalu - 25 Ini
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Total Hari Masuk / Hadir</label>
                      <button
                        type="button"
                        onClick={() => handleSyncAttendanceForManual()}
                        className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                        title="Ambil dan hitung otomatis dari data absensi karyawan"
                      >
                        <Zap className="w-3 h-3 text-emerald-700 fill-emerald-700" />
                        <span>⚡ Ambil dari Absensi</span>
                      </button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={manualDaysPresent}
                        onChange={(e) => handleSyncDays(Number(e.target.value) || 0)}
                        className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-semibold">Hari</span>
                      <div className="flex gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleSyncDays(20)}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold"
                        >
                          20
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncDays(24)}
                          className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-lg text-[10px] font-bold"
                        >
                          24
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncDays(27)}
                          className="px-2 py-1 bg-emerald-200 hover:bg-emerald-300 text-slate-900 rounded-lg text-[10px] font-bold"
                        >
                          27
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncDays(30)}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold"
                        >
                          30
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Komponen Gaji Pokok */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#3d1e0f] uppercase tracking-wider">
                    2. Gaji Pokok
                  </span>
                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-200">
                    <button
                      type="button"
                      onClick={() => setBaseMode('fixed')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                        baseMode === 'fixed'
                          ? 'bg-[#3d1e0f] text-amber-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tetap / Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setBaseMode('daily')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                        baseMode === 'daily'
                          ? 'bg-[#3d1e0f] text-amber-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Hitung Harian (Tarif x Hari)
                    </button>
                  </div>
                </div>

                {baseMode === 'fixed' ? (
                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-amber-100">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">Nominal Gaji Pokok Tetap</span>
                      <span className="text-[10px] text-slate-400">Gaji bulanan reguler</span>
                    </div>
                    <div className="w-48">
                      <input
                        type="number"
                        value={baseFixedAmount}
                        onChange={(e) => setBaseFixedAmount(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black font-mono text-right text-slate-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tarif per Hari (Rp)</label>
                        <input
                          type="number"
                          value={baseDailyRate}
                          onChange={(e) => setBaseDailyRate(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Jumlah Hari</label>
                        <input
                          type="number"
                          value={baseDays}
                          onChange={(e) => setBaseDays(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Subtotal Pokok</span>
                        <span className="font-mono font-black text-xs text-[#3d1e0f]">
                          {formatRupiah(calcBaseTotal)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-amber-800">
                      Rumus: {formatRupiah(baseDailyRate)} x {baseDays} hari = {formatRupiah(calcBaseTotal)}
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Komponen Uang Makan (Perkalian) */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider">
                    3. Uang Makan (Perkalian Hari)
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-800">
                    Subtotal: {formatRupiah(calcMealTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-emerald-100">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tarif Makan per Hari (Rp)</label>
                    <input
                      type="number"
                      value={mealRate}
                      onChange={(e) => setMealRate(Number(e.target.value) || 0)}
                      placeholder="15000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-1 text-center font-bold text-slate-400 text-sm">
                    x
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Jumlah Hari</label>
                    <input
                      type="number"
                      value={mealDays}
                      onChange={(e) => setMealDays(Number(e.target.value) || 0)}
                      placeholder="24"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-3 text-right">
                    <span className="text-[10px] text-slate-400 block">Total Makan</span>
                    <span className="font-mono font-black text-xs text-emerald-700">
                      {formatRupiah(calcMealTotal)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-emerald-800">
                  Contoh: Makan {formatRupiah(mealRate)} x {mealDays} hari = {formatRupiah(calcMealTotal)}
                </p>
              </div>

              {/* 4. Komponen Uang Transport (Perkalian) */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">
                    4. Uang Transportasi (Perkalian Hari)
                  </span>
                  <span className="text-xs font-mono font-black text-blue-800">
                    Subtotal: {formatRupiah(calcTransportTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-blue-100">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tarif Transport per Hari (Rp)</label>
                    <input
                      type="number"
                      value={transportRate}
                      onChange={(e) => setTransportRate(Number(e.target.value) || 0)}
                      placeholder="15000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-1 text-center font-bold text-slate-400 text-sm">
                    x
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Jumlah Hari</label>
                    <input
                      type="number"
                      value={transportDays}
                      onChange={(e) => setTransportDays(Number(e.target.value) || 0)}
                      placeholder="24"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-3 text-right">
                    <span className="text-[10px] text-slate-400 block">Total Transport</span>
                    <span className="font-mono font-black text-xs text-blue-700">
                      {formatRupiah(calcTransportTotal)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-blue-800">
                  Contoh: Transport {formatRupiah(transportRate)} x {transportDays} hari = {formatRupiah(calcTransportTotal)}
                </p>
              </div>

              {/* 5. Komponen Lembur Mingguan / Jam */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableOvertime}
                      onChange={(e) => setEnableOvertime(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider">
                      5. Lembur (Overtime Mingguan / Jam)
                    </span>
                  </label>
                  {enableOvertime && (
                    <span className="text-xs font-mono font-black text-purple-800">
                      Subtotal: {formatRupiah(calcOvertimeTotal)}
                    </span>
                  )}
                </div>

                {enableOvertime && (
                  <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Judul Lembur</label>
                        <input
                          type="text"
                          value={overtimeTitle}
                          onChange={(e) => setOvertimeTitle(e.target.value)}
                          placeholder="Lembur Mingguan"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tarif (Rp)</label>
                        <input
                          type="number"
                          value={overtimeRate}
                          onChange={(e) => setOvertimeRate(Number(e.target.value) || 0)}
                          placeholder="25000"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-1 text-center font-bold text-slate-400 text-sm">
                        x
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Pengali</label>
                        <input
                          type="number"
                          value={overtimeMultiplier}
                          onChange={(e) => setOvertimeMultiplier(Number(e.target.value) || 0)}
                          placeholder="4"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Satuan</label>
                        <select
                          value={overtimeUnit}
                          onChange={(e) => setOvertimeUnit(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        >
                          <option value="minggu">Minggu</option>
                          <option value="jam">Jam</option>
                          <option value="hari">Hari</option>
                          <option value="shift">Shift</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-purple-800">
                      Rincian: {overtimeTitle} {formatRupiah(overtimeRate)} x {overtimeMultiplier} {overtimeUnit} = {formatRupiah(calcOvertimeTotal)}
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Bonus / Poin Tambahan */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#3d1e0f] uppercase tracking-wider">
                    6. Bonus & Tunjangan Tambahan (Poin / Baju / Omzet)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddManualBonus}
                    className="text-xs text-brand-800 font-extrabold hover:underline"
                  >
                    + Tambah Baris Bonus
                  </button>
                </div>

                {manualBonuses.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Tidak ada bonus tambahan.</p>
                ) : (
                  <div className="space-y-2">
                    {manualBonuses.map((bonus, idx) => (
                      <div key={bonus.id || idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={bonus.name}
                            onChange={(e) => handleUpdateManualBonus(idx, { name: e.target.value })}
                            placeholder="Nama bonus (e.g. Bonus Omzet, Uang Baju)"
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                          />

                          <select
                            value={bonus.mode}
                            onChange={(e) => handleUpdateManualBonus(idx, { mode: e.target.value as any })}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                          >
                            <option value="fixed">Nominal Langsung</option>
                            <option value="multiplier">Tarif x Qty</option>
                          </select>

                          {bonus.mode === 'fixed' ? (
                            <input
                              type="number"
                              value={bonus.rate}
                              onChange={(e) => handleUpdateManualBonus(idx, { rate: Number(e.target.value) || 0 })}
                              placeholder="Rp"
                              className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-black font-mono text-right text-emerald-800"
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={bonus.rate}
                                onChange={(e) => handleUpdateManualBonus(idx, { rate: Number(e.target.value) || 0 })}
                                placeholder="Tarif"
                                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-right"
                              />
                              <span className="text-xs font-bold text-slate-400">x</span>
                              <input
                                type="number"
                                value={bonus.qty}
                                onChange={(e) => handleUpdateManualBonus(idx, { qty: Number(e.target.value) || 0 })}
                                placeholder="Qty"
                                className="w-14 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-center"
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveManualBonus(bonus.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="Hapus baris bonus ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {bonus.mode === 'multiplier' && (
                          <div className="flex justify-between items-center text-[10px] text-emerald-800 font-mono pl-1">
                            <span>
                              {formatRupiah(bonus.rate)} x {bonus.qty} {bonus.unit} = {formatRupiah(bonus.total)}
                            </span>
                            <span className="font-bold">Total: {formatRupiah(bonus.total)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Potongan Gaji (Kasbon / Keterlambatan) */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-rose-900 uppercase tracking-wider">
                    7. Potongan Gaji (Kasbon / Izin / Keterlambatan)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddManualDeduction}
                    className="text-xs text-rose-700 font-extrabold hover:underline"
                  >
                    + Tambah Potongan
                  </button>
                </div>

                {manualDeductions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Tidak ada potongan gaji (nihil).</p>
                ) : (
                  <div className="space-y-2">
                    {manualDeductions.map((ded, idx) => (
                      <div key={ded.id || idx} className="bg-white p-2.5 rounded-xl border border-rose-100 flex items-center gap-2">
                        <input
                          type="text"
                          value={ded.name}
                          onChange={(e) => handleUpdateManualDeduction(idx, { name: e.target.value })}
                          placeholder="Nama potongan (e.g. Kasbon Toko, Terlambat)"
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        />
                        <input
                          type="number"
                          value={ded.amount}
                          onChange={(e) => handleUpdateManualDeduction(idx, { amount: Number(e.target.value) || 0 })}
                          placeholder="Nominal Potongan (Rp)"
                          className="w-32 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-black font-mono text-right text-rose-700"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveManualDeduction(ded.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 8. Catatan Khusus Slip */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Contoh: Ditransfer via BCA a.n Siti Kasir tanggal 28 Okt 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              {/* 9. Live Summary & Grand Total (Netto) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#3d1e0f] to-amber-950 text-white space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-[11px] text-amber-200">
                  <span>Total Penerimaan Bruto:</span>
                  <span className="font-mono font-bold">{formatRupiah(calcGrossTotal)}</span>
                </div>
                {calcDeductionsTotal > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-rose-300">
                    <span>Total Potongan:</span>
                    <span className="font-mono font-bold">-{formatRupiah(calcDeductionsTotal)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-amber-800/80 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                      TOTAL GAJI BERSIH (NETTO)
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Yang wajib dibayarkan ke karyawan
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                      {formatRupiah(calcNetTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Helper text explaining that saving stores permanently in history */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-[#3d1e0f] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Slip ini akan otomatis tersimpan permanen di <strong>Riwayat Slip Gaji</strong> dan dapat dicetak, di-copy ke WhatsApp, atau diedit kapan saja.
                </span>
              </div>

              {/* Submit Buttons with Explicit Save to History Options */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualSlipModal(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>

                {/* Tombol Simpan Riwayat Saja */}
                <button
                  type="button"
                  disabled={isSubmittingManual}
                  onClick={(e) => handleSubmitManualSlip(e, false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-amber-300 font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{isSubmittingManual ? 'Menyimpan...' : '💾 Simpan Riwayat Gaji'}</span>
                </button>

                {/* Tombol Simpan & Buka Slip Gaji */}
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Eye className="w-4 h-4 text-amber-300" />
                  <span>{isSubmittingManual ? 'Menyimpan...' : '👁️ Simpan & Cetak Slip'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PENGATURAN KOMPONEN GAJI DEFAULT KARYAWAN */}
      {/* ======================================================== */}
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
                    placeholder="15000"
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
                    placeholder="15000"
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
                  className="flex-1 py-3 rounded-xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-md"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: OFFICIAL BEAUTIFUL PAY SLIP & PRINTABLE DOCUMENT */}
      {/* ======================================================== */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[95vh] flex flex-col">
            
            {/* Modal Top Control Bar (Hidden when printing) */}
            <div className="p-3.5 bg-[#3d1e0f] text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-xs tracking-wider uppercase text-amber-300">
                  Pratinjau Slip Gaji Resmi
                </span>
              </div>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="p-1 rounded-lg text-amber-200 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Gaji Content (Formatted for Screen & Printable PDF Document) */}
            <div id="receipt-print-area" className="p-5 sm:p-8 bg-white text-slate-800 space-y-4 sm:space-y-5 overflow-y-auto">
              
              {/* Header Company & Logo */}
              <div className="flex items-center justify-between border-b-2 border-[#3d1e0f] pb-3 sm:pb-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black border border-amber-500/40 p-1 shadow-lg flex items-center justify-center font-bold text-white text-2xl overflow-hidden shrink-0">
                    <img
                      src={settings.logo_url || '/logo.jpg'}
                      alt="Logo"
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        e.currentTarget.src = '/logo.jpg';
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base sm:text-xl text-[#3d1e0f] tracking-tight leading-none uppercase">
                      {settings.app_name}
                    </h2>
                    <p className="text-xs font-semibold text-amber-700 mt-1">{settings.brand_owner}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Spesialis Pancong Lumer & Minuman Segar</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 sm:px-3 py-1 rounded-full bg-[#3d1e0f] text-amber-300 font-extrabold text-[11px] sm:text-xs tracking-wider uppercase shadow-xs">
                    SLIP GAJI
                  </span>
                  <p className="text-xs sm:text-sm font-black text-slate-900 mt-1">
                    {formatMonthOnly(selectedPayroll.snapshot_data?.period_label || selectedMonth)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Cut-off: {selectedPayroll.snapshot_data?.cutoff_range || currentCutoff.rangeText}
                  </p>
                </div>
              </div>

              {/* Employee & Document Meta Info Box */}
              <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Karyawan</span>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{selectedPayroll.user_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cabang Penugasan</span>
                  <span className="font-bold text-[#3d1e0f]">{selectedPayroll.branch_name || 'Cidodol'}</span>
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

              {/* Itemized Compensation Table dengan Rincian Perkalian Transparan */}
              <div className="space-y-2.5 sm:space-y-3">
                <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>Rincian Penerimaan & Komponen Gaji</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700">Rincian Perkalian Resmi</span>
                </p>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase text-left">
                      <th className="py-1 font-bold">Komponen Gaji</th>
                      <th className="py-1 font-bold text-right">Rincian Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    
                    {/* Gaji Pokok */}
                    <tr>
                      <td className="py-2.5">
                        <span className="font-bold">Gaji Pokok</span>
                        {selectedPayroll.snapshot_data?.base_salary?.mode === 'daily' ? (
                          <span className="text-[11px] text-slate-500 font-mono block">
                            ( {formatRupiah(selectedPayroll.snapshot_data.base_salary.rate)} x {selectedPayroll.snapshot_data.base_salary.days} hari )
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">(Gaji Pokok Reguler Bulanan)</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(selectedPayroll.base_salary_calculated)}
                      </td>
                    </tr>

                    {/* Uang Makan - Selalu Tampilkan Perkalian yang Jelas! */}
                    <tr>
                      <td className="py-2.5">
                        <span className="font-bold">Uang Makan</span>
                        {(() => {
                          const days = selectedPayroll.days_present || 0;
                          const mRate = selectedPayroll.snapshot_data?.meal?.rate || (days > 0 ? Math.round(selectedPayroll.meal_calculated / days) : 15000);
                          const mDays = selectedPayroll.snapshot_data?.meal?.days || days;
                          return (
                            <span className="text-[11px] text-emerald-700 font-mono font-semibold block">
                              ( {formatRupiah(mRate)} x {mDays} hari )
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-emerald-800">
                        {formatRupiah(selectedPayroll.meal_calculated)}
                      </td>
                    </tr>

                    {/* Uang Transportasi - Selalu Tampilkan Perkalian yang Jelas! */}
                    <tr>
                      <td className="py-2.5">
                        <span className="font-bold">Uang Transportasi Operasional</span>
                        {(() => {
                          const days = selectedPayroll.days_present || 0;
                          const tRate = selectedPayroll.snapshot_data?.transport?.rate || (days > 0 ? Math.round(selectedPayroll.transport_calculated / days) : 15000);
                          const tDays = selectedPayroll.snapshot_data?.transport?.days || days;
                          return (
                            <span className="text-[11px] text-blue-700 font-mono font-semibold block">
                              ( {formatRupiah(tRate)} x {tDays} hari )
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-blue-800">
                        {formatRupiah(selectedPayroll.transport_calculated)}
                      </td>
                    </tr>

                    {/* Lembur (Overtime) jika dari Manual Snapshot */}
                    {selectedPayroll.snapshot_data?.overtime && (
                      <tr className="bg-purple-50/50">
                        <td className="py-2.5 text-purple-950">
                          <span className="font-bold">{selectedPayroll.snapshot_data.overtime.title || 'Lembur Mingguan'}</span>
                          <span className="text-[11px] text-purple-700 font-mono block">
                            ( {formatRupiah(selectedPayroll.snapshot_data.overtime.rate)} x {selectedPayroll.snapshot_data.overtime.multiplier} {selectedPayroll.snapshot_data.overtime.unit} )
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-purple-900">
                          +{formatRupiah(selectedPayroll.snapshot_data.overtime.total)}
                        </td>
                      </tr>
                    )}

                    {/* Custom Components / Bonus Tambahan */}
                    {selectedPayroll.custom_components
                      ?.filter((c) => {
                        if (selectedPayroll.snapshot_data?.overtime && c.name.includes(selectedPayroll.snapshot_data.overtime.title)) {
                          return false;
                        }
                        return true;
                      })
                      .map((c, idx) => (
                        <tr
                          key={idx}
                          className={c.type === 'bonus' ? 'bg-emerald-50/40' : 'bg-rose-50/40'}
                        >
                          <td className={`py-2.5 font-semibold flex items-center gap-1.5 ${c.type === 'bonus' ? 'text-emerald-900' : 'text-rose-900'}`}>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${c.type === 'bonus' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                            />
                            <span>{c.name}</span>
                          </td>
                          <td
                            className={`py-2.5 text-right font-mono font-bold ${
                              c.type === 'bonus' ? 'text-emerald-800' : 'text-rose-800'
                            }`}
                          >
                            {c.type === 'bonus' ? '+' : '-'} {formatRupiah(c.amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Highlight Net Salary Summary Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#3d1e0f] to-amber-950 text-white flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">Total Gaji Bersih (Netto)</p>
                  <p className="text-xs text-slate-300">Telah disetujui & ditransfer/tunai</p>
                </div>
                <div className="text-right">
                  <p className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                    {formatRupiah(selectedPayroll.net_salary)}
                  </p>
                </div>
              </div>

              {/* Notes jika ada */}
              {selectedPayroll.snapshot_data?.notes && (
                <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-slate-700 italic">
                  <strong>Catatan:</strong> "{selectedPayroll.snapshot_data.notes}"
                </div>
              )}

              {/* Signatures & Approval Area */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Penerima Gaji,</p>
                  <div className="h-10 flex items-end justify-center">
                    <span className="border-b border-slate-400 w-32 inline-block font-bold text-slate-900">
                      ( {selectedPayroll.user_name?.split(' ')[0] || 'Karyawan'} )
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">Owner / Management,</p>
                  <div className="h-10 flex items-end justify-center">
                    <span className="border-b border-slate-400 w-32 inline-block font-bold text-slate-900">
                      ( Nasrullah )
                    </span>
                  </div>
                </div>
              </div>

              {/* Watermark / Footer */}
              <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-dashed border-slate-200">
                <p>Dokumen Resmi Slip Gaji Mister Pancong Lumer • Dicetak Otomatis</p>
              </div>

            </div>

            {/* Action Control Buttons (HANYA 1 TOMBOL COPY GAMBAR SLIP UNTUK WA) */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2.5 print:hidden">
              
              {/* HANYA 1 TOMBOL COPY GAMBAR SLIP */}
              <button
                onClick={handleCopySlipImage}
                disabled={isCopyingImage}
                className={`w-full sm:flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                  copyImageSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                }`}
                title="Copy gambar slip gaji ke clipboard untuk langsung ditempel (Ctrl+V) di WhatsApp"
              >
                {isCopyingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses Gambar Slip...</span>
                  </>
                ) : copyImageSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>✓ Gambar Tersalin! Tinggal Tempel (Ctrl+V) di WA</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-emerald-200" />
                    <span>📸 Copy Gambar Slip (Paste ke WA)</span>
                  </>
                )}
              </button>

              {/* Tombol Print & Tutup */}
              <div className="flex w-full sm:w-auto items-center gap-2">
                <button
                  onClick={handlePrintPDF}
                  className="flex-1 sm:flex-none py-3 px-4 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition-colors"
                  title="Cetak PDF Slip Gaji"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print PDF</span>
                </button>

                <button
                  onClick={() => setSelectedPayroll(null)}
                  className="py-3 px-5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
