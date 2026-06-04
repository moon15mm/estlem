'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';

interface QrScanClientProps {
  qr: string;
}

export function QrScanClient({ qr }: QrScanClientProps) {
  const router = useRouter();
  const setStore = useCart((state) => state.setStore);

  useEffect(() => {
    api
      .get(`/stores/qr/${qr}`)
      .then((data: any) => {
        sessionStorage.setItem('estlem_spot_id', data.spot.id);
        sessionStorage.setItem('estlem_spot_number', data.spot.spotNumber);
        // Detect spot type from spotNumber prefix (T:) or qrCode prefix (TBL-)
        const isTable =
          data.spot.spotNumber?.startsWith('T:') ||
          data.spot.qrCode?.startsWith('TBL-') ||
          data.spot.type === 'table';
        sessionStorage.setItem('estlem_spot_type', isTable ? 'table' : 'parking');
        setStore(data.store.id);
        router.replace(`/store/${data.store.id}?tenantId=${data.store.tenantId}`);
      })
      .catch(() => router.replace('/not-found'));
  }, [qr, router, setStore]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B4F72]">
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">جاري تحميل المتجر...</p>
      </div>
    </div>
  );
}
