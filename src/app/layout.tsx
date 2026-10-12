import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import AppLayoutWrapper from '@/components/layout/AppLayoutWrapper';

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
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
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
            <AppLayoutWrapper>{children}</AppLayoutWrapper>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
