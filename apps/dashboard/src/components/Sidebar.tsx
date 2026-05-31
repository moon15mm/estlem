'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, Package, Users, BarChart3, Settings, LogOut, Car } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/orders',    icon: ClipboardList, label: 'الطلبات' },
  { href: '/products',  icon: Package,       label: 'المنتجات' },
  { href: '/staff',     icon: Users,         label: 'الموظفون' },
  { href: '/analytics', icon: BarChart3,     label: 'التحليلات' },
  { href: '/settings',  icon: Settings,      label: 'الإعدادات' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, logout } = useAuth();

  // Redirect to login if session is missing (e.g. after logout or expiry)
  useEffect(() => {
    if (!useAuth.getState().token) router.replace('/login');
  }, [router]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className="w-64 bg-primary min-h-screen flex flex-col py-6 px-4 sticky top-0 h-screen">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
          <Car className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-black text-white text-sm">استلم</p>
          <p className="text-white/60 text-xs">{staff?.name ?? 'موظف'}</p>
        </div>
      </div>

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
        <LogOut className="h-5 w-5" /> خروج
      </button>
    </aside>
  );
}
