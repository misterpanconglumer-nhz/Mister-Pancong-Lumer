'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AttendanceRecord } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatDate, formatTimeOnly } from '@/lib/utils/formatters';
import { CalendarCheck, Clock, CheckCircle2, UserCheck, Store } from 'lucide-react';

export default function AttendancePage() {
  const { user, activeBranch } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

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
      const data = await DataService.getAttendance();
      setRecords(data);

      if (user) {
        const today = getTodayDateStr();
        const current = data.find((r) => r.user_id === user.id && r.date === today);
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
  }, [user, activeBranch]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const bList = await DataService.getBranches();
      const branchToUse = activeBranch || bList[0];
      const currentUserName = user?.full_name || 'Next Karyawan';
      const currentUserId = user?.id || '33333333-3333-3333-3333-333333333333';
      const currentUserRole = user?.role || 'penjual';

      await DataService.clockIn(
        currentUserId,
        currentUserName,
        currentUserRole,
        branchToUse?.id || 'd9ec11ac-c42f-4904-b932-20abbe83e89e',
        branchToUse?.name || 'Cidodol'
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

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-xs">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Absensi & Shift Kerja</h1>
        <p className="text-xs text-slate-500 mt-0.5">Pencatatan jam masuk & jam selesai kerja kasir/karyawan</p>
      </div>

      {/* Clock In / Clock Out Card Mobile Optimized */}
      <div className="bg-gradient-to-br from-[#3d1e0f] via-[#522b17] to-amber-950 text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] text-amber-300 font-bold">Presensi Shift Hari Ini</p>
              <h2 className="text-sm sm:text-base font-black text-white">{user?.full_name}</h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500 text-[#3d1e0f]">
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
              ✓ Absensi shift hari ini telah selesai!
            </div>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">Riwayat Presensi Karyawan</h3>
          <span className="text-[11px] text-slate-400 font-medium">{records.length} Catatan</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat data absensi...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Belum Ada Catatan Absensi</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((att) => (
              <div
                key={att.id}
                className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{att.user_name || 'Karyawan'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 capitalize">
                      {att.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-slate-400" />
                      {att.branch_name || 'Cabang'}
                    </span>
                    <span>• {formatDate(att.date)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono font-bold text-slate-900 text-xs">
                    {att.clock_in ? formatTimeOnly(att.clock_in) : '-'} s/d {att.clock_out ? formatTimeOnly(att.clock_out) : 'Berlangsung'}
                  </p>
                  <p className="text-[10px] text-slate-400">{att.notes}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
