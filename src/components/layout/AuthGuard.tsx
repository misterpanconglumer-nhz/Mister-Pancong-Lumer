'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const OWNER_ONLY_PATHS = [
  '/dashboard',
  '/payroll',
  '/branches',
  '/products',
  '/settings',
  '/daily-reports',
];

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isOwner } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If user is not logged in and not on /login, redirect to /login
    if (!user && pathname !== '/login') {
      router.replace('/login');
      return;
    }

    // If user is logged in and on /login, redirect to appropriate home
    if (user && pathname === '/login') {
      if (isOwner) {
        router.replace('/dashboard');
      } else {
        router.replace('/pos');
      }
      return;
    }

    // Role-based route protection: Penjual/Non-owner accessing owner-only paths
    if (user && !isOwner && OWNER_ONLY_PATHS.includes(pathname)) {
      router.replace('/pos');
    }
  }, [user, loading, pathname, isOwner, router]);

  // Loading state screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#3d1e0f] flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/40 p-2 shadow-2xl flex items-center justify-center mb-4 animate-pulse">
          <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl" />
        </div>
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat Aplikasi...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated and not on /login, don't flash content before redirecting
  if (!user && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-[#3d1e0f] flex flex-col items-center justify-center text-white p-4">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Mengarahkan ke Halaman Login...</span>
        </div>
      </div>
    );
  }

  // On login page, render children directly (without main navbar/sidebar wrapper)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return <>{children}</>;
};

export default AuthGuard;
