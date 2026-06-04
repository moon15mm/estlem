'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface QrScanClientProps {
  qr: string;
}

export function QrScanClient({ qr }: QrScanClientProps) {
  const router = useRouter();
  const setStore = useCart((state) => state.setStore);
  const { isLoggedIn } = useCustomerAuth();

  useEffect(() => {
    // Require login first — save redirect target
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
    <div className="min-h-screen flex items-center justify-center bg-[#1B4F72]">
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">جاري تحميل المتجر...</p>
      </div>
    </div>
  );
}
