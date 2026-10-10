'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShoppingCart, Receipt, Wallet, CalendarCheck, ClipboardList, LayoutDashboard, UtensilsCrossed, Banknote } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { isOwner, isAdminPusat } = useAuth();
  const { cartTotalCount } = useApp();

  const navItems = [
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
    {
      label: 'Laporan',
      href: '/daily-reports',
      icon: ClipboardList,
    },
  ];

  if (isOwner || isAdminPusat) {
    navItems.push({
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    });
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1 px-2 md:hidden shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center py-1.5 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-800 font-bold bg-amber-50 scale-105'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-800' : 'text-slate-400'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-accent-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-bounce">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
