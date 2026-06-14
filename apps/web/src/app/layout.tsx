import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { GeofenceProvider } from '@/components/GeofenceProvider';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
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
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-background antialiased">
        <I18nProvider>
          {children}
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          {/* @ts-expect-error Async Server Component */}
          <GeofenceProviderWrapper />
        </I18nProvider>
      </body>
    </html>
  );
}
