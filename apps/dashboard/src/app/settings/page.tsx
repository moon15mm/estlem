'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import type { Store, ParkingSpot } from '@estlem/shared';
import {
  DINE_IN_CATEGORIES, StoreCategory, Language,
  ServicePlan, SERVICE_PLAN_META, SubscriptionStatus,
} from '@estlem/shared';
import { LanguageSettings } from '@/components/LanguageSettings';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Store as StoreIcon, QrCode, Plus, Copy, Loader2, LogOut,
  MapPin, Navigation, Check, Phone, CreditCard, Banknote, Smartphone,
  Car, UtensilsCrossed, Layers,
} from 'lucide-react';

const WEB_URL = 'https://estlem.store';

export default function SettingsPage() {
  const router = useRouter();
  const { t, dir } = useTranslation();
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
  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    card: true,
    mada: true,
    apple_pay: false,
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [moyasarPub, setMoyasarPub] = useState('');
  const [moyasarSec, setMoyasarSec] = useState('');
  const [savingGateway, setSavingGateway] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [serviceMode, setServiceMode] = useState('drive_through');
  const [subscription, setSubscription] = useState<{ plan: ServicePlan; status: SubscriptionStatus } | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [newTable, setNewTable] = useState('');
  const [addingTable, setAddingTable] = useState(false);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [s, sp, subResp] = await Promise.all([
        api.get(`/stores/${storeId}`),
        api.get(`/stores/${storeId}/parking-spots`),
        api.get('/service-subscriptions/me').catch(() => ({ subscription: null })),
      ]);
      setSubscription((subResp as any)?.subscription ?? null);
      const storeData = s as unknown as Store;
      setStore(storeData);
      setEditLat(storeData.lat ? String(storeData.lat) : '');
      setEditLng(storeData.lng ? String(storeData.lng) : '');
      setEditAddress(storeData.address ?? '');
      setEditPhone(storeData.phoneNumber ?? '');
      // Load payment settings from store settings (stored in tenant or store metadata)
      const storeSettings = (storeData as any).operatingHours?.paymentMethods;
      if (storeSettings) {
        setPaymentMethods(storeSettings);
      }
      const ps = (storeData as any).operatingHours?.paymentSettings ?? {};
      setMoyasarPub(ps.moyasarPublishableKey ?? '');
      setMoyasarSec(ps.moyasarSecretKey ?? '');
      // Only allow dine-in modes for restaurants/cafes/buffets
      const savedMode = (storeData as any).operatingHours?.serviceMode ?? 'drive_through';
      const canDineIn = DINE_IN_CATEGORIES.includes(storeData.category as StoreCategory);
      setServiceMode(canDineIn ? savedMode : 'drive_through');
      setSpots((sp as unknown as ParkingSpot[]) ?? []);
    } catch {
      toast.error(t('settings.loadFailed'));
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
      toast.success(t('settings.spotAdded'));
      setNewSpot('');
      load();
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setAdding(false);
    }
  };

  const copyLink = (qr: string) => {
    navigator.clipboard.writeText(`${WEB_URL}/scan/${qr}`);
    toast.success(t('settings.linkCopied'));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('settings.locationNotSupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditLat(pos.coords.latitude.toFixed(7));
        setEditLng(pos.coords.longitude.toFixed(7));
        setLocating(false);
        toast.success(t('settings.locationDetected'));
      },
      (err) => {
        setLocating(false);
        toast.error(t('settings.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const saveLocation = async () => {
    if (!editLat || !editLng) {
      toast.error(t('settings.selectLocationFirst'));
      return;
    }
    setSavingLocation(true);
    try {
      await api.put(`/stores/${storeId}`, {
        lat: parseFloat(editLat),
        lng: parseFloat(editLng),
        address: editAddress || undefined,
      });
      toast.success(t('settings.locationSaved'));
      load();
    } catch {
      toast.error(t('settings.locationFailed'));
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
      toast.success(t('settings.infoSaved'));
      load();
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingInfo(false);
    }
  };

  const savePaymentMethods = async () => {
    setSavingPayment(true);
    try {
      await api.put(`/stores/${storeId}`, {
        operatingHours: {
          ...(store as any)?.operatingHours,
          paymentMethods,
        },
      });
      toast.success(t('settings.paymentSaved'));
      load();
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingPayment(false);
    }
  };

  const saveGatewaySettings = async () => {
    setSavingGateway(true);
    try {
      await api.put(`/stores/${storeId}`, {
        operatingHours: {
          ...(store as any)?.operatingHours,
          paymentSettings: {
            provider: moyasarPub || moyasarSec ? 'moyasar' : 'test',
            moyasarPublishableKey: moyasarPub.trim() || undefined,
            moyasarSecretKey: moyasarSec.trim() || undefined,
          },
        },
      });
      toast.success(t('settings.gatewaySaved'));
      load();
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setSavingGateway(false);
    }
  };

  const togglePayment = (key: keyof typeof paymentMethods) => {
    setPaymentMethods((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveServiceMode = async (mode: string) => {
    // Client-side guard — backend will eventually enforce too
    const needsDine = mode === 'dine_in' || mode === 'both';
    const needsDrive = mode === 'drive_through' || mode === 'both';
    if ((needsDine && !canDineIn) || (needsDrive && !canDriveThrough) || !subActive) {
      toast.error('هذا الوضع غير مشمول باشتراكك — رقّ الباقة أولاً');
      return;
    }
    const previousMode = serviceMode;
    setServiceMode(mode);
    setSavingMode(true);
    try {
      const newOperatingHours = {
        ...((store as any)?.operatingHours || {}),
        serviceMode: mode,
      };
      const result = await api.put(`/stores/${storeId}`, {
        operatingHours: newOperatingHours,
      });
      // Update local store state directly with returned data
      if (result) {
        setStore(result as unknown as Store);
      }
      toast.success(t('settings.modeUpdated'));
    } catch (err: any) {
      console.error('Save service mode error:', err);
      setServiceMode(previousMode);
      toast.error(err?.response?.data?.message || t('settings.saveFailed'));
    } finally {
      setSavingMode(false);
    }
  };

  const addTable = async () => {
    if (!newTable.trim()) return;
    setAddingTable(true);
    try {
      await api.post(`/stores/${storeId}/parking-spots`, {
        spotNumbers: [newTable.trim()],
        type: 'table',
      });
      toast.success(t('settings.tableAdded'));
      setNewTable('');
      load();
    } catch {
      toast.error(t('settings.saveFailed'));
    } finally {
      setAddingTable(false);
    }
  };

  const tables = spots.filter((s) => s.spotNumber?.startsWith('T:'));
  const parkingSpots = spots.filter((s) => !s.spotNumber?.startsWith('T:'));

  // Allowed service modes = subscription plan ∩ store category capability
  const subActive =
    !!subscription &&
    (subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.GRACE ||
      subscription.status === SubscriptionStatus.TRIAL);

  const canDineInCategory =
    !!store && DINE_IN_CATEGORIES.includes(store.category as StoreCategory);

  const allowedModes: ('drive_through' | 'dine_in')[] = subActive && subscription
    ? SERVICE_PLAN_META[subscription.plan].includes.filter(
        (m) => m === 'drive_through' || canDineInCategory,
      )
    : [];
  const canDriveThrough = allowedModes.includes('drive_through');
  const canDineIn = allowedModes.includes('dine_in');
  const canBoth = canDriveThrough && canDineIn;

  const hasLocation = !!editLat && !!editLng;
  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(editLng) - 0.005},${parseFloat(editLat) - 0.003},${parseFloat(editLng) + 0.005},${parseFloat(editLat) + 0.003}&layer=mapnik&marker=${editLat},${editLng}`
    : '';

  return (
    <div className="flex min-h-screen bg-background" dir={dir}>
      <Sidebar />
      <main className="flex-1 p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-black text-foreground">{t('settings.title')}</h1>

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
                  <StoreIcon className="h-5 w-5 text-primary" /> {t('settings.storeInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t('settings.nameAr')}</p>
                    <p className="font-semibold">{store?.nameAr}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t('settings.nameEn')}</p>
                    <p className="font-semibold">{store?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t('settings.category')}</p>
                    <Badge>{store?.category}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t('settings.status')}</p>
                    <Badge variant={store?.isActive ? 'success' : 'muted'}>
                      {store?.isActive ? t('settings.active') : t('settings.inactive')}
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      <Phone className="h-3 w-3 inline ml-1" /> {t('settings.phone')}
                    </label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('settings.address')}</label>
                    <Input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder={t('settings.addressPlaceholder')}
                    />
                  </div>
                  <Button onClick={saveStoreInfo} disabled={savingInfo} size="sm" className="gap-2">
                    {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {t('settings.saveInfo')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> {t('settings.locationOnMap')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('settings.locationDesc')}
                </p>

                <div className="flex gap-2">
                  <Button onClick={detectLocation} disabled={locating} variant="outline" className="gap-2">
                    {locating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    {locating ? t('settings.locating') : t('settings.detectLocation')}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('settings.latitude')}</label>
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
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('settings.longitude')}</label>
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
                      title={t('settings.mapTitle')}
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
                        {t('settings.openInGoogleMaps')}
                      </a>
                    </div>
                  </div>
                )}

                <Button onClick={saveLocation} disabled={savingLocation || !hasLocation} className="gap-2">
                  {savingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('settings.saveLocation')}
                </Button>
              </CardContent>
            </Card>

            {/* Service Mode — only for restaurants/cafes/buffets with at least one allowed mode */}
            {canDineInCategory && allowedModes.length > 0 && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" /> {t('settings.serviceMode')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('settings.serviceModeDesc')}</p>
                {!subActive && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    اشتراكك غير نشط — لا يمكن تغيير وضع الخدمة. <a href="/subscription" className="font-bold underline">جدّد الآن</a>
                  </div>
                )}
                {subActive && !canBoth && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
                    اشتراكك الحالي ({SERVICE_PLAN_META[subscription!.plan].nameAr}) يشمل {allowedModes.length === 1 ? 'وضع خدمة واحد فقط' : 'الوضعين'}.
                    {!canBoth && <> للحصول على المزيد، <a href="/subscription" className="font-bold underline">رقّ للباقة الشاملة</a>.</>}
                  </div>
                )}
                <div className={cn(
                  'grid gap-3',
                  allowedModes.length === 1 ? 'grid-cols-1 max-w-sm' :
                  canBoth ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
                )}>
                  {[
                    { key: 'drive_through', label: t('settings.serviceDrive'), desc: t('settings.serviceDriveDesc'), icon: <Car className="h-5 w-5" />,             show: canDriveThrough },
                    { key: 'dine_in',       label: t('settings.serviceDine'),  desc: t('settings.serviceDineDesc'),  icon: <UtensilsCrossed className="h-5 w-5" />, show: canDineIn },
                    { key: 'both',          label: t('settings.serviceBoth'),  desc: t('settings.serviceBothDesc'),  icon: <Layers className="h-5 w-5" />,          show: canBoth },
                  ].filter((m) => m.show).map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => saveServiceMode(mode.key)}
                      disabled={savingMode}
                      className={`border rounded-xl p-4 text-right transition-all cursor-pointer ${
                        serviceMode === mode.key
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                        serviceMode === mode.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {mode.icon}
                      </div>
                      <p className="font-bold text-sm">{mode.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>}

            {/* Tables (Dine-in) — eligible category + dine_in covered by subscription + selected mode */}
            {canDineInCategory && canDineIn &&
              (serviceMode === 'dine_in' || serviceMode === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5 text-primary" /> {t('settings.tables')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newTable}
                      onChange={(e) => setNewTable(e.target.value)}
                      placeholder={t('settings.tableNumberPlaceholder')}
                      onKeyDown={(e) => e.key === 'Enter' && addTable()}
                    />
                    <Button onClick={addTable} disabled={addingTable} className="gap-1 shrink-0">
                      {addingTable ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {t('settings.addBtn')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {tables.map((tbl) => (
                      <div key={tbl.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="accent">🍽️ {t('settings.tableLabel')} {tbl.spotNumber.replace('T:', '')}</Badge>
                          <code className="text-xs text-muted-foreground" dir="ltr">{tbl.qrCode}</code>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => copyLink(tbl.qrCode)} className="gap-1">
                          <Copy className="h-3.5 w-3.5" /> {t('settings.copyLink')}
                        </Button>
                      </div>
                    ))}
                    {tables.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-6">{t('settings.noTablesYet')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> {t('settings.paymentMethods')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('settings.paymentMethodsDesc')}</p>

                <div className="space-y-3">
                  {[
                    { key: 'cash'      as const, label: t('settings.cashOption'),   icon: <Banknote className="h-5 w-5" />,    desc: t('settings.cashOptionDesc') },
                    { key: 'card'      as const, label: t('settings.cardOption'),   icon: <CreditCard className="h-5 w-5" />,  desc: t('settings.cardOptionDesc') },
                    { key: 'mada'      as const, label: t('settings.madaOption'),   icon: <CreditCard className="h-5 w-5" />,  desc: t('settings.madaOptionDesc') },
                    { key: 'apple_pay' as const, label: 'Apple Pay',                icon: <Smartphone className="h-5 w-5" />,  desc: t('settings.applePayDesc') },
                  ].map((method) => (
                    <div
                      key={method.key}
                      className={`flex items-center justify-between border rounded-xl p-4 transition-all cursor-pointer ${
                        paymentMethods[method.key]
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-secondary/20 opacity-60'
                      }`}
                      onClick={() => togglePayment(method.key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          paymentMethods[method.key] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {method.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{method.label}</p>
                          <p className="text-xs text-muted-foreground">{method.desc}</p>
                        </div>
                      </div>
                      <div className={`w-12 h-7 rounded-full relative transition-colors ${
                        paymentMethods[method.key] ? 'bg-primary' : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${
                          paymentMethods[method.key] ? 'left-0.5' : 'left-[22px]'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={savePaymentMethods} disabled={savingPayment} className="gap-2">
                  {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('settings.savePayment')}
                </Button>
              </CardContent>
            </Card>

            {/* Payment Gateway — Moyasar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> {t('settings.gateway')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                  {t('settings.gatewayIntro')}{' '}
                  <a href="https://moyasar.com" target="_blank" rel="noreferrer" className="font-bold underline">
                    moyasar.com
                  </a>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Publishable Key (pk_...)
                  </label>
                  <Input
                    value={moyasarPub}
                    onChange={(e) => setMoyasarPub(e.target.value)}
                    placeholder="pk_test_xxxxxxxxxxxx"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Secret Key (sk_...)
                  </label>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={moyasarSec}
                      onChange={(e) => setMoyasarSec(e.target.value)}
                      placeholder="sk_test_xxxxxxxxxxxx"
                      dir="ltr"
                      className="pl-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((p) => !p)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-1 cursor-pointer"
                    >
                      {showSecret ? t('settings.hide') : t('settings.show')}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t('settings.secretEncrypted')}
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                  <strong>{t('settings.testMode')}</strong> {t('settings.testModeDesc')}
                  <br />
                  {t('settings.testCard')} <code className="bg-amber-100 px-1 rounded" dir="ltr">4111 1111 1111 1111</code>
                </div>

                <Button onClick={saveGatewaySettings} disabled={savingGateway} className="gap-2">
                  {savingGateway ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('settings.saveGateway')}
                </Button>

                {/* Status indicator */}
                <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
                  moyasarSec
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${moyasarSec ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {moyasarSec ? t('settings.gatewayActive') : t('settings.gatewayTest')}
                </div>
              </CardContent>
            </Card>

            {/* Parking spots + QR — only if drive_through is in the subscription AND selected */}
            {canDriveThrough && (serviceMode === 'drive_through' || serviceMode === 'both') && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" /> {t('settings.parkingSpotsTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newSpot}
                    onChange={(e) => setNewSpot(e.target.value)}
                    placeholder={t('settings.spotNumberPlaceholder')}
                    onKeyDown={(e) => e.key === 'Enter' && addSpot()}
                  />
                  <Button onClick={addSpot} disabled={adding} className="gap-1 shrink-0">
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {t('settings.addBtn')}
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
                        <Copy className="h-3.5 w-3.5" /> {t('settings.copyLink')}
                      </Button>
                    </div>
                  ))}
                  {spots.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-6">{t('settings.noSpotsYet')}</p>
                  )}
                </div>
              </CardContent>
            </Card>}

            {/* Languages */}
            {store && (
              <LanguageSettings
                storeId={store.id}
                initialDefault={(store as any).defaultLanguage as Language | undefined}
                initialSupported={(store as any).supportedLanguages as Language[] | undefined}
              />
            )}

            {/* Account */}
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.account')}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{staff?.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{staff?.mobile}</p>
                </div>
                <Button variant="destructive" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" /> {t('settings.logout')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
