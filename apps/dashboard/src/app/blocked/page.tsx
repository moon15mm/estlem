'use client';

import { useEffect, useState } from 'react';
import { Ban, UserX, Loader2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BlockedCustomer {
  id: string;
  customerId: string;
  mobile: string;
  fullName?: string;
  reason?: string;
  blockedBy?: string;
  createdAt: string;
}

export default function BlockedCustomersPage() {
  const [list, setList] = useState<BlockedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/customers/blocked/list') as BlockedCustomer[];
      setList(data ?? []);
    } catch {
      toast.error('فشل تحميل قائمة المحظورين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const unblock = async (id: string, customerId: string) => {
    if (!confirm('فك الحظر عن هذا العميل؟')) return;
    setUnblocking(id);
    try {
      await api.post(`/customers/${customerId}/unblock`);
      toast.success('تم فك الحظر');
      setList((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('فشل فك الحظر');
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">العملاء المحظورين</h1>
            <p className="text-muted-foreground text-sm">{list.length} عميل محظور</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <Card className="border-dashed">
            <div className="text-center py-16 text-muted-foreground">
              <UserX className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-bold">لا يوجد عملاء محظورين</p>
              <p className="text-xs mt-1">يمكنك حظر العملاء من بطاقة الطلب</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((b) => (
              <Card key={b.id} className="p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground">{b.fullName ?? 'بدون اسم'}</p>
                    <Badge variant="destructive" className="text-[10px]">محظور</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground" dir="ltr">{b.mobile}</p>
                  {b.reason && (
                    <p className="text-xs text-amber-700 bg-amber-50 mt-2 px-2 py-1 rounded-md inline-block">
                      السبب: {b.reason}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    منذ {new Date(b.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblock(b.id, b.customerId)}
                  disabled={unblocking === b.id}
                  className="gap-1.5"
                >
                  {unblocking === b.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  فك الحظر
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
