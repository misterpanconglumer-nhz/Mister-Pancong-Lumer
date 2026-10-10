'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AttendanceRecord } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatDateTime, formatDate, formatTimeOnly } from '@/lib/utils/formatters';
import { CalendarCheck, Clock, CheckCircle2, UserCheck, AlertCircle, Store, ShieldAlert } from 'lucide-react';

export default function AttendancePage() {
  const { user, activeBranch, isOwner, isAdminPusat } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const data = await DataService.getAttendance();
      setRecords(data);

      if (user) {
        const today = new Date().toISOString().split('T')[0];
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
    if (!user || !activeBranch) return;
    setActionLoading(true);
    try {
      await DataService.clockIn(user.id, user.full_name, user.role, activeBranch.id, activeBranch.name);
      await fetchAttendance();
    } catch (err) {
      console.error('Clock in failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await DataService.clockOut(user.id);
      await fetchAttendance();
    } catch (err) {
      console.error('Clock out failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Absensi & Shift Kerja</h1>
          <p className="text-xs text-slate-500 mt-0.5">Pencatatan jam masuk & jam selesai kerja kasir/karyawan</p>
        </div>
      </div>

      {/* Clock In / Clock Out Card */}
      <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-amber-950 text-white p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-amber-300 font-semibold">Status Presensi Hari Ini</p>
              <h2 className="text-base font-extrabold text-white">{user?.full_name}</h2>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-brand-900">
            {activeBranch ? `Cabang ${activeBranch.name}` : 'Mister Pancong Lumer'}
          </span>
        </div>

        {/* Current Shift Status Banner */}
        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-200 font-medium">Jam Masuk (Clock In)</p>
            <p className="text-sm font-extrabold font-mono text-white">
              {todayRecord?.clock_in ? formatTimeOnly(todayRecord.clock_in) : 'Belum Absen Masuk'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-amber-200 font-medium">Jam Selesai (Clock Out)</p>
            <p className="text-sm font-extrabold font-mono text-white">
              {todayRecord?.clock_out ? formatTimeOnly(todayRecord.clock_out) : 'Belum Absen Selesai'}
            </p>
          </div>
        </div>

        {/* Clock In / Out Buttons */}
        <div className="flex gap-3 pt-1">
          {!todayRecord?.clock_in ? (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-brand-900 font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>{actionLoading ? 'Memproses...' : 'Mulai Shift (Clock In)'}</span>
            </button>
          ) : !todayRecord?.clock_out ? (
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionLoading ? 'Memproses...' : 'Selesai Shift (Clock Out)'}</span>
            </button>
          ) : (
            <div className="w-full py-3 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold text-xs text-center">
              ✓ Absensi shift hari ini sudah lengkap!
            </div>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900">Riwayat Presensi Karyawan</h3>
          <span className="text-xs text-slate-400 font-medium">{records.length} Catatan</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat data absensi...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum Ada Catatan Absensi</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((att) => (
              <div
                key={att.id}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{att.user_name || 'Karyawan'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 capitalize">
                      {att.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      {att.branch_name || 'Cabang'}
                    </span>
                    <span>Tanggal: {formatDate(att.date)}</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <p className="font-mono font-bold text-slate-900">
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
