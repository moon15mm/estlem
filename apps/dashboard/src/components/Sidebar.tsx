'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, Package, Users, BarChart3, Settings, LogOut, Car, Ban } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, logout } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!useAuth.getState().token) router.replace('/login');
  }, [router]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const NAV = [
    { href: '/orders',    icon: ClipboardList, label: t('nav.orders') },
    { href: '/products',  icon: Package,       label: t('nav.products') },
    { href: '/staff',     icon: Users,         label: t('nav.staff') },
    { href: '/analytics', icon: BarChart3,     label: t('nav.analytics') },
    { href: '/blocked',   icon: Ban,           label: t('nav.blocked') },
    { href: '/settings',  icon: Settings,      label: t('nav.settings') },
  ];

  return (
    <aside className="w-64 bg-primary min-h-screen flex flex-col py-6 px-4 sticky top-0 h-screen">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
          <Car className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-black text-white text-sm">{t('app.name')}</p>
          <p className="text-white/60 text-xs">{staff?.name ?? t('common.staff')}</p>
        </div>
      </div>

      {/* Language Switcher + Bell */}
      <div className="mb-4 px-1 flex items-center gap-2">
        <LanguageSwitcher compact />
        <NotificationBell />
      </div>

      {/* Subscription banner */}
      <SubscriptionBanner />

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors mt-4"
      >
        <LogOut className="h-5 w-5" /> {t('nav.logout')}
      </button>
    </aside>
  );
}
