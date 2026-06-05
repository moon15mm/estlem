import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { GlobalOrderNotifications } from '@/components/GlobalOrderNotifications';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'استلم — لوحة التحكم',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1B4F72',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-background antialiased">
        <I18nProvider>
          {children}
          <Toaster position="top-center" />
          <GlobalOrderNotifications />
        </I18nProvider>
      </body>
    </html>
  );
}
