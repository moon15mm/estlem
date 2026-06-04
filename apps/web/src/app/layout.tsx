import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { GeofenceProvider } from '@/components/GeofenceProvider';
import './globals.css';
import 'moyasar-payment-form/dist/moyasar.css';

function GeofenceProviderWrapper() {
  return <GeofenceProvider />;
}

export const metadata: Metadata = {
  title: 'استلم | اطلب من سيارتك',
  description: 'اطلب منتجاتك دون النزول من سيارتك',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'استلم' },
};

export const viewport: Viewport = {
  themeColor: '#14B8A6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Next.js auto-generates favicon from app/icon.svg and app/apple-icon.svg */}
      </head>
      <body className="bg-background antialiased">
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        {/* @ts-expect-error Async Server Component */}
        <GeofenceProviderWrapper />
      </body>
    </html>
  );
}
