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
import {
  Store as StoreIcon, QrCode, Plus, Copy, Loader2, LogOut,
  MapPin, Navigation, Check, Phone,
} from 'lucide-react';

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
  const [locating, setLocating] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [s, sp] = await Promise.all([
        api.get(`/stores/${storeId}`),
        api.get(`/stores/${storeId}/parking-spots`),
      ]);
      const storeData = s as unknown as Store;
      setStore(storeData);
      setEditLat(storeData.lat ? String(storeData.lat) : '');
      setEditLng(storeData.lng ? String(storeData.lng) : '');
      setEditAddress(storeData.address ?? '');
      setEditPhone(storeData.phoneNumber ?? '');
      setSpots((sp as unknown as ParkingSpot[]) ?? []);
    } catch {
      toast.error('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storeId]);

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

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditLat(pos.coords.latitude.toFixed(7));
        setEditLng(pos.coords.longitude.toFixed(7));
        setLocating(false);
        toast.success('تم تحديد الموقع');
      },
      (err) => {
        setLocating(false);
        toast.error('فشل تحديد الموقع — تأكد من السماح بالوصول');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const saveLocation = async () => {
    if (!editLat || !editLng) {
      toast.error('حدد الموقع أولاً');
      return;
    }
    setSavingLocation(true);
    try {
      await api.put(`/stores/${storeId}`, {
        lat: parseFloat(editLat),
        lng: parseFloat(editLng),
        address: editAddress || undefined,
      });
      toast.success('تم حفظ الموقع');
      load();
    } catch {
      toast.error('فشل حفظ الموقع');
    } finally {
      setSavingLocation(false);
    }
  };

  const saveStoreInfo = async () => {
    setSavingInfo(true);
    try {
      await api.put(`/stores/${storeId}`, {
        phoneNumber: editPhone || undefined,
        address: editAddress || undefined,
      });
      toast.success('تم حفظ المعلومات');
      load();
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSavingInfo(false);
    }
  };

  const hasLocation = !!editLat && !!editLng;
  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(editLng) - 0.005},${parseFloat(editLat) - 0.003},${parseFloat(editLng) + 0.005},${parseFloat(editLat) + 0.003}&layer=mapnik&marker=${editLat},${editLng}`
    : '';

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-black text-foreground">الإعدادات</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted/50 border-0" />
            ))}
          </div>
        ) : (
          <>
            {/* Store info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StoreIcon className="h-5 w-5 text-primary" /> معلومات المتجر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      <Phone className="h-3 w-3 inline ml-1" /> رقم الهاتف
                    </label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">العنوان</label>
                    <Input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="مثال: حي النخيل، شارع الأمير سلطان"
                    />
                  </div>
                  <Button onClick={saveStoreInfo} disabled={savingInfo} size="sm" className="gap-2">
                    {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    حفظ المعلومات
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> موقع المتجر على الخريطة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  حدد موقع متجرك ليظهر للعملاء على الخريطة ويمكنهم الوصول إليك بسهولة.
                </p>

                <div className="flex gap-2">
                  <Button onClick={detectLocation} disabled={locating} variant="outline" className="gap-2">
                    {locating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    {locating ? 'جاري تحديد الموقع...' : 'حدد موقعي الحالي'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">خط العرض (Lat)</label>
                    <Input
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="24.7136"
                      dir="ltr"
                      type="number"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">خط الطول (Lng)</label>
                    <Input
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="46.6753"
                      dir="ltr"
                      type="number"
                      step="any"
                    />
                  </div>
                </div>

                {hasLocation && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <iframe
                      src={mapUrl}
                      width="100%"
                      height="250"
                      style={{ border: 0 }}
                      loading="lazy"
                      title="موقع المتجر"
                    />
                    <div className="bg-secondary/50 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {editLat}, {editLng}
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${editLat},${editLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        فتح في خرائط Google ↗
                      </a>
                    </div>
                  </div>
                )}

                <Button onClick={saveLocation} disabled={savingLocation || !hasLocation} className="gap-2">
                  {savingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  حفظ الموقع
                </Button>
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
