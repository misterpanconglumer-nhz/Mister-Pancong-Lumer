import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import MobileNav from '@/components/layout/MobileNav';
import Sidebar from '@/components/layout/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#6b3e26',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Mister Pancong Lumer - By Manage Nafa Family',
  description: 'Sistem POS, Penjualan, Laporan Harian, Absensi, dan Penggajian Terintegrasi Multi-Cabang',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mister Pancong Lumer',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-cream-50 text-slate-800 min-h-screen flex flex-col antialiased selection:bg-amber-200 selection:text-brand-900`}>
        <AuthProvider>
          <AppProvider>
            <Navbar />
            <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-6">
              <Sidebar />
              <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
            </div>
            <MobileNav />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
