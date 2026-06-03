'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, Package, Users, BarChart3, Settings, LogOut, Car, Menu, X } from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!useAuth.getState().token) router.replace('/login');
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────── */}
      <aside className="hidden md:flex w-64 bg-primary min-h-screen flex-col py-6 px-4 sticky top-0 h-screen shrink-0">
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer',
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors mt-4 cursor-pointer"
        >
          <LogOut className="h-5 w-5" /> خروج
        </button>
      </aside>

      {/* ── Mobile Top Bar ───────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-white" />
          <span className="font-black text-white text-sm">استلم</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1 cursor-pointer">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 right-0 w-64 bg-primary rounded-bl-2xl shadow-2xl p-4 space-y-1">
            <p className="text-white/60 text-xs px-3 mb-2">{staff?.name ?? 'موظف'}</p>
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-white/70 active:bg-white/10',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/70 active:bg-white/10 w-full mt-2 cursor-pointer"
            >
              <LogOut className="h-5 w-5" /> خروج
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Tab Bar ────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around py-2 px-1">
        {NAV.slice(0, 5).map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors cursor-pointer',
                active ? 'text-primary' : 'text-gray-400',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer for mobile top bar */}
      <div className="md:hidden h-14 shrink-0" />
    </>
  );
}
