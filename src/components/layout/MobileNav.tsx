'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShoppingCart, Receipt, Wallet, CalendarCheck, ClipboardList, LayoutDashboard } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { isOwner, isAdminPusat, isAdminCabang } = useAuth();
  const { cartTotalCount } = useApp();
  const isPenjual = !isOwner && !isAdminPusat && !isAdminCabang;

  const navItems = (isOwner || isAdminPusat) ? [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Laporan',
      href: '/daily-reports',
      icon: ClipboardList,
    },
    {
      label: 'Kasir',
      href: '/pos',
      icon: ShoppingCart,
      badge: cartTotalCount > 0 ? cartTotalCount : undefined,
    },
    {
      label: 'Pengeluaran',
      href: '/expenses',
      icon: Wallet,
    },
    {
      label: 'Riwayat',
      href: '/sales',
      icon: Receipt,
    },
  ] : [
    {
      label: 'Kasir',
      href: '/pos',
      icon: ShoppingCart,
      badge: cartTotalCount > 0 ? cartTotalCount : undefined,
    },
    {
      label: 'Riwayat',
      href: '/sales',
      icon: Receipt,
    },
    {
      label: 'Pengeluaran',
      href: '/expenses',
      icon: Wallet,
    },
    {
      label: 'Absensi',
      href: '/attendance',
      icon: CalendarCheck,
    },
    ...(!isPenjual ? [{ label: 'Laporan', href: '/daily-reports', icon: ClipboardList }] : []),
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-amber-900/10 py-1.5 px-2 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-[#3d1e0f] font-black bg-amber-100/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#3d1e0f] stroke-[2.5]' : 'text-slate-400'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 bg-amber-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-sm animate-bounce">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black text-[#3d1e0f]' : 'font-semibold'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
