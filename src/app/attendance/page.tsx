'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AttendanceRecord, UserProfile } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatDate, formatTimeOnly } from '@/lib/utils/formatters';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  UserCheck,
  Store,
  User,
  Filter,
  Calendar,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function AttendancePage() {
  const { user, activeBranch, branches, isOwner, isAdminPusat } = useAuth();
  const isEmployee = !isOwner && !isAdminPusat;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Parameter Filter states
  const [filterMode, setFilterMode] = useState<'month' | 'range' | 'all'>('month');
  const [filterMonth, setFilterMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // If employee, query only their own records from DataService
      const [data, uList] = await Promise.all([
        DataService.getAttendance(undefined, undefined, isEmployee ? user?.id : undefined),
        (isOwner || isAdminPusat) ? DataService.getUsers() : Promise.resolve([]),
      ]);
      setRecords(data);
      if (uList.length > 0) setUsersList(uList);

      if (user) {
        const today = getTodayDateStr();
        const current = data.find((r) => (r.user_id === user.id || r.user_name === user.full_name) && r.date === today);
        setTodayRecord(current || null);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user, activeBranch, isEmployee]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const bList = await DataService.getBranches();
      const branchToUse = activeBranch || bList[0];
      const currentUserName = user?.full_name || 'Karyawan';
      const currentUserId = user?.id || '33333333-3333-3333-3333-333333333333';
      const currentUserRole = user?.role || 'penjual';

      await DataService.clockIn(
        currentUserId,
        currentUserName,
        currentUserRole,
        branchToUse?.id || 'd9ec11ac-c42f-4904-b932-20abbe83e89e',
        branchToUse?.name || 'Cabang'
      );
      await fetchAttendance();
      alert('✓ Presensi masuk shift berhasil dicatat!');
    } catch (err) {
      console.error('Clock in failed:', err);
      alert('Gagal mencatat presensi. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const currentUserId = user?.id || '33333333-3333-3333-3333-333333333333';
      await DataService.clockOut(currentUserId);
      await fetchAttendance();
      alert('✓ Presensi selesai shift (Clock Out) berhasil dicatat!');
    } catch (err) {
      console.error('Clock out failed:', err);
      alert('Gagal mencatat clock out. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper calculate shift duration in hours and minutes
  const formatDuration = (clockIn?: string, clockOut?: string) => {
    if (!clockIn) return '-';
    if (!clockOut) return 'Shift Berlangsung';
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    const diffMs = end - start;
    if (diffMs <= 0) return '-';
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours} jam ${minutes} mnt`;
    if (hours > 0) return `${hours} jam`;
    return `${minutes} mnt`;
  };

  // Strict filtered display records
  const displayRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Strict Employee Scope: only own records
      if (isEmployee) {
        const matchId = user?.id && r.user_id === user.id;
        const matchName = user?.full_name && r.user_name?.toLowerCase().trim() === user.full_name?.toLowerCase().trim();
        if (!matchId && !matchName) return false;
      } else {
        // Owner / Admin filters
        if (filterBranchId !== 'all') {
          const bObj = branches.find((b) => b.id === filterBranchId);
          const matchId = r.branch_id === filterBranchId;
          const matchName = bObj && (r.branch_name === bObj.name || r.branch_id === bObj.code);
          if (!matchId && !matchName) return false;
        }

        if (filterEmployeeId !== 'all') {
          if (r.user_id !== filterEmployeeId) return false;
        }
      }

      // 2. Date / Month Filter
      if (filterMode === 'month') {
        if (filterMonth && !r.date?.startsWith(filterMonth)) return false;
      } else if (filterMode === 'range') {
        if (filterStartDate && r.date < filterStartDate) return false;
        if (filterEndDate && r.date > filterEndDate) return false;
      }

      return true;
    });
  }, [records, isEmployee, user, branches, filterBranchId, filterEmployeeId, filterMode, filterMonth, filterStartDate, filterEndDate]);

  // Statistics for active view
  const attendedCount = useMemo(() => {
    return displayRecords.filter((r) => r.status === 'hadir').length;
  }, [displayRecords]);

  const currentMonthLabel = useMemo(() => {
    if (filterMode === 'month' && filterMonth) {
      const [year, month] = filterMonth.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    if (filterMode === 'range' && filterStartDate && filterEndDate) {
      return `${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`;
    }
    return 'Semua Periode';
  }, [filterMode, filterMonth, filterStartDate, filterEndDate]);

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-amber-900/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-700" />
            <span>{isEmployee ? 'Presensi & Shift Saya' : 'Absensi & Shift Kerja Karyawan'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmployee
              ? `Riwayat jam kerja, kehadiran shift, dan absensi khusus akun Anda (${user?.full_name || 'Karyawan'}).`
              : 'Pantau kehadiran, jam masuk, jam pulang, dan durasi shift kerja seluruh karyawan cabang.'}
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-[#3d1e0f] font-bold text-xs flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Total Kehadiran: <strong className="font-extrabold text-[#3d1e0f]">{attendedCount} Hari Shift</strong></span>
          </div>
        </div>
      </div>

      {/* Clock In / Clock Out Card */}
      <div className="bg-gradient-to-br from-[#3d1e0f] via-[#522b17] to-amber-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] text-amber-300 font-bold">Presensi Shift Hari Ini</p>
              <h2 className="text-sm sm:text-base font-black text-white">{user?.full_name || 'Karyawan'}</h2>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500 text-[#3d1e0f]">
            {activeBranch ? `Cabang ${activeBranch.name}` : 'Mister Pancong Lumer'}
          </span>
        </div>

        {/* Current Shift Status Banner */}
        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs">
          <div>
            <p className="text-[10px] text-amber-200 font-medium">Jam Masuk (Clock In)</p>
            <p className="text-sm font-black font-mono text-white mt-0.5">
              {todayRecord?.clock_in ? formatTimeOnly(todayRecord.clock_in) : 'Belum Absen'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-amber-200 font-medium">Jam Selesai (Clock Out)</p>
            <p className="text-sm font-black font-mono text-white mt-0.5">
              {todayRecord?.clock_out ? formatTimeOnly(todayRecord.clock_out) : 'Belum Absen'}
            </p>
          </div>
        </div>

        {/* Clock In / Out Buttons */}
        <div className="pt-1">
          {!todayRecord?.clock_in ? (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-[#3d1e0f] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5 stroke-[2.5]" />
              <span>{actionLoading ? 'Memproses...' : 'Mulai Shift (Clock In)'}</span>
            </button>
          ) : !todayRecord?.clock_out ? (
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>{actionLoading ? 'Memproses...' : 'Selesai Shift (Clock Out)'}</span>
            </button>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold text-xs text-center">
              ✓ Absensi shift hari ini telah selesai! ({formatTimeOnly(todayRecord.clock_in)} s/d {formatTimeOnly(todayRecord.clock_out)})
            </div>
          )}
        </div>
      </div>

      {/* Parameter Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Filter Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'month'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Pilih Bulan
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'range'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📆 Rentang Tanggal
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-[#3d1e0f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Periode
            </button>
          </div>

          {/* Owner Only: Branch & Employee Selectors */}
          {!isEmployee && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Branch Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Store className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">Semua Cabang</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Cabang {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">Semua Karyawan</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Employee Privacy Badge */}
          {isEmployee && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Khusus Riwayat: <strong>{user?.full_name}</strong> ({activeBranch?.name || 'Cabang'})</span>
            </div>
          )}
        </div>

        {/* Date Inputs according to Mode */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {filterMode === 'month' ? (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Pilih Bulan:</span>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f]"
              />
              <button
                type="button"
                onClick={() => setFilterMonth(new Date().toISOString().slice(0, 7))}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-[#3d1e0f] transition-all"
              >
                ⚡ Bulan Ini
              </button>
            </div>
          ) : filterMode === 'range' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-slate-500 text-[11px]">Dari:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <span className="text-xs text-slate-400 font-bold">s/d</span>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-slate-500 text-[11px]">Sampai:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan seluruh riwayat presensi tanpa batasan tanggal.
            </div>
          )}

          <div className="ml-auto text-xs text-slate-500 font-semibold">
            Periode: <strong className="text-slate-900">{currentMonthLabel}</strong>
          </div>
        </div>
      </div>

      {/* Attendance History List */}
      <div className="bg-white rounded-3xl border border-amber-900/10 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-slate-900">
              {isEmployee ? 'Daftar Presensi Shift Anda' : 'Riwayat Presensi Karyawan'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-[#3d1e0f]">
              {displayRecords.length} Catatan
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {isEmployee ? 'Terverifikasi' : 'Rekapitulasi Shift'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Memuat data absensi...</div>
        ) : displayRecords.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Tidak Ada Catatan Presensi</p>
            <p className="text-xs text-slate-400">
              {isEmployee
                ? `Tidak ditemukan catatan kehadiran Anda untuk periode ${currentMonthLabel}.`
                : 'Belum ada data absensi untuk filter yang dipilih.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayRecords.map((att) => {
              const durationStr = formatDuration(att.clock_in, att.clock_out);
              return (
                <div
                  key={att.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{att.user_name || 'Karyawan'}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 capitalize">
                        ✓ {att.status}
                      </span>
                      {att.clock_out ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                          ⏱️ {durationStr}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          Sedang Bertugas
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Store className="w-3.5 h-3.5 text-amber-700" />
                        {att.branch_name || 'Cabang'}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-slate-800">{formatDate(att.date)}</span>
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <p className="font-mono font-extrabold text-slate-900 text-xs">
                      {att.clock_in ? formatTimeOnly(att.clock_in) : '-'} s/d {att.clock_out ? formatTimeOnly(att.clock_out) : 'Berlangsung'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {att.notes || 'Presensi Kasir'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
