'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { Car } from 'lucide-react';

interface QrScanClientProps {
  qr: string;
}

export function QrScanClient({ qr }: QrScanClientProps) {
  const router = useRouter();
  const setStore = useCart((state) => state.setStore);
  const { isLoggedIn } = useCustomerAuth();
  const { t, dir } = useTranslation();

  useEffect(() => {
    if (!isLoggedIn()) {
      sessionStorage.setItem('estlem_pending_qr', qr);
      router.replace(`/login?redirect=/scan/${qr}`);
      return;
    }

    api
      .get(`/stores/qr/${qr}`)
      .then((data: any) => {
        sessionStorage.setItem('estlem_spot_id', data.spot.id);
        sessionStorage.setItem('estlem_spot_number', data.spot.spotNumber);
        const isTable =
          data.spot.spotNumber?.startsWith('T:') ||
          data.spot.qrCode?.startsWith('TBL-') ||
          data.spot.type === 'table';
        sessionStorage.setItem('estlem_spot_type', isTable ? 'table' : 'parking');
        setStore(data.store.id);
        router.replace(`/store/${data.store.id}?tenantId=${data.store.tenantId}`);
      })
      .catch(() => router.replace('/not-found'));
  }, [qr, router, setStore, isLoggedIn]);

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col items-center justify-center" dir={dir}>
      <div className="text-center">
        <div className="w-16 h-16 bg-[#111] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Car className="h-8 w-8 text-white" />
        </div>
        <div className="w-10 h-10 border-2 border-[#EBEBEB] border-t-[#111] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-bold text-[#555]">{t('store.loadingStore')}</p>
        <p className="text-xs text-[#AAA] mt-1">جاري التحقق من الرمز...</p>
      </div>
    </div>
  );
}
