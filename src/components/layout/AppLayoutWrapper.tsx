'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

export const AppLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <Navbar />
      <div className="flex-1 flex w-full pb-20 md:pb-6">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-w-0">{children}</main>
      </div>
      <MobileNav />
    </AuthGuard>
  );
};

export default AppLayoutWrapper;
