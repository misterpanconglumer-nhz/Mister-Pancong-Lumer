'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingCart,
  Receipt,
  Wallet,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  UtensilsCrossed,
  Store,
  Banknote,
  Settings,
  Users,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isOwner, isAdminPusat, isAdminCabang } = useAuth();
  const { cartTotalCount } = useApp();

  const mainNav = [
    { label: 'Kasir POS', href: '/pos', icon: ShoppingCart, badge: cartTotalCount > 0 ? cartTotalCount : undefined },
    { label: 'Riwayat Penjualan', href: '/sales', icon: Receipt },
    { label: 'Pengeluaran', href: '/expenses', icon: Wallet },
    { label: 'Laporan Harian & Kas', href: '/daily-reports', icon: ClipboardList },
    { label: 'Absensi & Shift', href: '/attendance', icon: CalendarCheck },
  ];

  const adminNav = [
    { label: 'Dashboard Center', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Produk & Varian', href: '/products', icon: UtensilsCrossed },
  ];

  if (isOwner) {
    adminNav.push(
      { label: 'Cabang & Karyawan', href: '/branches', icon: Store },
      { label: 'Penggajian (Payroll)', href: '/payroll', icon: Banknote },
      { label: 'Pengaturan Brand', href: '/settings', icon: Settings }
    );
  } else if (isAdminPusat) {
    adminNav.push({ label: 'Penggajian (Payroll)', href: '/payroll', icon: Banknote });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] border-r border-slate-800 p-4">
      {/* Operasional Section */}
      <div className="mb-6">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Operasional Cabang</p>
        <div className="space-y-1">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-700 text-amber-100 font-semibold shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-brand-900">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin / Owner Section */}
      {(isOwner || isAdminPusat || isAdminCabang) && (
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Manajemen & Reports</p>
          <div className="space-y-1">
            {adminNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-brand-900 font-bold shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-900' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
