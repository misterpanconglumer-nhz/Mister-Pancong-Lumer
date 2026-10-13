'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { SaleTransaction, Expense, DailyReport, Branch } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah } from '@/lib/utils/formatters';
import { LayoutDashboard, TrendingUp, DollarSign, ShoppingBag, Wallet, Store, ShieldCheck, AlertCircle, Sparkles, Award, Lock, UtensilsCrossed, Users, Banknote, ClipboardList, Settings, ArrowRight, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { isOwner, isAdminPusat } = useAuth();

  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [sList, eList, rList, bList] = await Promise.all([
          DataService.getSales(),
          DataService.getExpenses(),
          DataService.getDailyReports(),
          DataService.getBranches(),
        ]);
        setSales(sList.filter((s) => s.status === 'completed'));
        setExpenses(eList.filter((e) => e.status === 'approved'));
        setReports(rList);
        setBranches(bList);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isOwner || isAdminPusat) {
      fetchDashboardData();
    }
  }, [isOwner, isAdminPusat]);

  // Strict Role Guard
  if (!isOwner && !isAdminPusat) {
    return (
      <div className="py-16 text-center space-y-3 bg-white rounded-3xl p-8 border border-slate-100 max-w-md mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500">
          Dashboard Pusat hanya dapat diakses oleh Owner dan Admin Pusat.
        </p>
      </div>
    );
  }

  // Calculate metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.created_at.startsWith(todayStr));
  const todayOmzet = todaySales.reduce((sum, s) => sum + s.total_amount, 0);

  const monthlyOmzet = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingExpensesCount = expenses.filter((e) => e.status === 'pending').length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  const productSalesCount: Record<string, number> = {};
  sales.forEach((s) => {
    s.items?.forEach((item) => {
      const name = item.product_name_snapshot;
      productSalesCount[name] = (productSalesCount[name] || 0) + item.quantity;
    });
  });

  const bestSellers = Object.entries(productSalesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 via-brand-800 to-amber-950 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">
            Pusat Kontrol Owner & Admin
          </span>
          <h1 className="text-xl font-extrabold text-white mt-1">Dashboard Manage Nafa Family</h1>
          <p className="text-xs text-amber-200">Statistik performa penjualan, pengeluaran & ringkasan operasional</p>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-right">
          <p className="text-[10px] text-amber-300 font-medium">Omzet Hari Ini</p>
          <p className="text-lg font-extrabold text-white font-mono">{formatRupiah(todayOmzet)}</p>
        </div>
      </div>

      {/* Quick Action Management Cards for Owner */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-900/10 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Menu Manajemen Owner & Admin</h2>
            <p className="text-[11px] text-slate-500">Akses cepat ke seluruh modul operasional bisnis Anda</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            href="/products"
            className="p-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/60 flex flex-col items-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#3d1e0f] text-amber-300 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">Produk & Menu</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Varian & Harga</p>
            </div>
          </Link>

          <Link
            href="/branches"
            className="p-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/60 flex flex-col items-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#3d1e0f] text-amber-300 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">Cabang & Tim</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Kelola Kasir</p>
            </div>
          </Link>

          <Link
            href="/payroll"
            className="p-3.5 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/60 flex flex-col items-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-emerald-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">Penggajian</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Slip & Bonus</p>
            </div>
          </Link>

          <Link
            href="/daily-reports"
            className="p-3.5 rounded-2xl bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/60 flex flex-col items-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-blue-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">Laporan Kas</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Tutup Kas Harian</p>
            </div>
          </Link>

          <Link
            href="/pos"
            className="p-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/60 flex flex-col items-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">Buka Kasir</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Transaksi POS</p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex flex-col items-center text-center gap-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">Pengaturan</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Brand & Cloud</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Pending Approvals Warning Banner */}
      {(pendingReportsCount > 0 || pendingExpensesCount > 0) && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Perlu Perhatian Owner:</p>
              <p className="text-xs text-amber-800">
                Terdapat {pendingReportsCount} laporan tutup kas & {pendingExpensesCount} pengeluaran menunggu persetujuan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 4 Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Omzet Bulan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-brand-900 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-extrabold text-brand-900">{formatRupiah(monthlyOmzet)}</p>
          <p className="text-[10px] text-slate-400">Total akumulasi penjualan</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Transaksi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-extrabold text-slate-900">{sales.length} TRX</p>
          <p className="text-[10px] text-slate-400">Hari ini: {todaySales.length} TRX</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Pengeluaran Operasional</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-extrabold text-rose-600">{formatRupiah(totalExpenses)}</p>
          <p className="text-[10px] text-slate-400">Bahan baku, es & operasional</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Arus Kas Bersih Cabang</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-extrabold text-emerald-700">{formatRupiah(monthlyOmzet - totalExpenses)}</p>
          <p className="text-[10px] text-slate-400">(Omzet - Pengeluaran)</p>
        </div>

      </div>

      {/* Branch Performance Comparison */}
      <div className="space-y-3">
        <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-600" />
          <span>Performa Penjualan Per Cabang</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => {
            const bSales = sales.filter((s) => s.branch_id === b.id);
            const bOmzet = bSales.reduce((sum, s) => sum + s.total_amount, 0);
            const bExpenses = expenses.filter((e) => e.branch_id === b.id).reduce((sum, e) => sum + e.amount, 0);

            return (
              <div key={b.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-brand-900 font-extrabold flex items-center justify-center">
                      {b.code}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Cabang {b.name}</h3>
                      <p className="text-[11px] text-slate-400">{bSales.length} Transaksi</p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-brand-900">{formatRupiah(bOmzet)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-2xl">
                    <span className="text-slate-400 text-[10px]">Total Pengeluaran</span>
                    <p className="font-bold text-rose-600">{formatRupiah(bExpenses)}</p>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-2xl">
                    <span className="text-emerald-700 text-[10px]">Arus Kas Masuk</span>
                    <p className="font-bold text-emerald-900">{formatRupiah(bOmzet - bExpenses)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best Sellers Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>Produk Pancong & Minuman Terlaris</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bestSellers.map(([pName, count], idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-amber-200 text-brand-900 font-extrabold text-xs flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="font-bold text-xs text-slate-900">{pName}</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-brand-900 text-amber-200 font-extrabold text-xs">
                {count} Porsi
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
