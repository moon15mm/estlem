'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import type { Store, ParkingSpot } from '@estlem/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store as StoreIcon, QrCode, Plus, Copy, Loader2, LogOut } from 'lucide-react';

const WEB_URL = 'https://estlem.store';

export default function SettingsPage() {
  const router = useRouter();
  const { storeId, staff, logout } = useAuth();
  const handleLogout = () => { logout(); router.replace('/login'); };
  const [store, setStore] = useState<Store | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSpot, setNewSpot] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [s, sp] = await Promise.all([
        api.get(`/stores/${storeId}`),
        api.get(`/stores/${storeId}/parking-spots`),
      ]);
      setStore(s as unknown as Store);
      setSpots((sp as unknown as ParkingSpot[]) ?? []);
    } catch {
      toast.error('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const addSpot = async () => {
    if (!newSpot.trim()) return;
    setAdding(true);
    try {
      await api.post(`/stores/${storeId}/parking-spots`, { spotNumbers: [newSpot.trim()] });
      toast.success('تمت إضافة الموقف');
      setNewSpot('');
      load();
    } catch {
      toast.error('فشل الإضافة');
    } finally {
      setAdding(false);
    }
  };

  const copyLink = (qr: string) => {
    navigator.clipboard.writeText(`${WEB_URL}/scan/${qr}`);
    toast.success('تم نسخ الرابط');
  };

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-black text-foreground">الإعدادات</h1>

        {loading ? (
          <Card className="h-40 animate-pulse bg-muted/50 border-0" />
        ) : (
          <>
            {/* Store info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StoreIcon className="h-5 w-5 text-primary" /> معلومات المتجر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">الاسم بالعربي</p>
                    <p className="font-semibold">{store?.nameAr}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">الاسم بالإنجليزي</p>
                    <p className="font-semibold">{store?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">التصنيف</p>
                    <Badge>{store?.category}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">الحالة</p>
                    <Badge variant={store?.isActive ? 'success' : 'muted'}>
                      {store?.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parking spots + QR */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" /> مواقف السيارات ورموز QR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newSpot}
                    onChange={(e) => setNewSpot(e.target.value)}
                    placeholder="رقم الموقف الجديد (مثل C-1)"
                    onKeyDown={(e) => e.key === 'Enter' && addSpot()}
                  />
                  <Button onClick={addSpot} disabled={adding} className="gap-1 shrink-0">
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    إضافة
                  </Button>
                </div>

                <div className="space-y-2">
                  {spots.map((sp) => (
                    <div key={sp.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="default">🅿️ {sp.spotNumber}</Badge>
                        <code className="text-xs text-muted-foreground" dir="ltr">{sp.qrCode}</code>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => copyLink(sp.qrCode)} className="gap-1">
                        <Copy className="h-3.5 w-3.5" /> نسخ الرابط
                      </Button>
                    </div>
                  ))}
                  {spots.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-6">لا توجد مواقف بعد</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account */}
            <Card>
              <CardHeader>
                <CardTitle>الحساب</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{staff?.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{staff?.mobile}</p>
                </div>
                <Button variant="destructive" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" /> تسجيل خروج
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
