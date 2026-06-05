'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, Clock3, XCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const ICON: Record<string, any> = {
  subscription_warning: Clock3,
  subscription_grace: AlertTriangle,
  subscription_expired: XCircle,
};
const TONE: Record<string, string> = {
  subscription_warning: 'text-amber-500',
  subscription_grace: 'text-amber-600',
  subscription_expired: 'text-red-500',
};

const formatTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `${days} ي`;
};

export function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!token) return;
    try {
      const r = (await api.get('/service-subscriptions/me/alerts')) as any;
      setAlerts(r?.alerts ?? []);
      setUnread(r?.unreadCount ?? 0);
    } catch { /* silently ignore */ }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const markAllRead = async () => {
    await api.post('/service-subscriptions/me/alerts/read-all', {});
    setUnread(0);
    setAlerts((a) => a.map((x) => ({ ...x, isRead: true })));
  };

  const openAlert = async (a: Alert) => {
    if (!a.isRead) {
      await api.post(`/service-subscriptions/me/alerts/${a.id}/read`, {});
      setAlerts((prev) => prev.map((x) => x.id === a.id ? { ...x, isRead: true } : x));
      setUnread((c) => Math.max(0, c - 1));
    }
    if (a.actionUrl) window.location.href = a.actionUrl;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white"
        aria-label="التنبيهات"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-black text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 max-h-[440px] overflow-hidden rounded-2xl border bg-white shadow-2xl z-50 text-foreground">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <span className="font-bold text-sm">التنبيهات</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-bold">
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[380px]">
            {alerts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>لا توجد تنبيهات</p>
              </div>
            ) : alerts.map((a) => {
              const Icon = ICON[a.type] ?? Bell;
              const tone = TONE[a.type] ?? 'text-primary';
              return (
                <button
                  key={a.id}
                  onClick={() => openAlert(a)}
                  className={cn(
                    'w-full text-right px-4 py-3 border-b last:border-b-0 hover:bg-muted/40 flex gap-3 items-start transition',
                    !a.isRead && 'bg-amber-50/40',
                  )}
                >
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', tone)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm font-bold leading-tight', !a.isRead && 'text-foreground')}>
                        {a.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(a.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.message}</p>
                  </div>
                  {!a.isRead && (
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
