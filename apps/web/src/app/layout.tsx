import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Arabic, Noto_Kufi_Arabic } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const notoSans = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  weight: ['500', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'استلم | اطلب من سيارتك',
  description: 'اطلب منتجاتك دون النزول من سيارتك',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'استلم' },
};

export const viewport: Viewport = {
  themeColor: '#1B4F72',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${notoSans.variable} ${notoKufi.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-background font-sans antialiased">
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
