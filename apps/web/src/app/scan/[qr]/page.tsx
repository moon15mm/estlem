'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';

interface Props { params: { qr: string } }

export default function QrScanPage({ params }: Props) {
  const router = useRouter();
  const setStore = useCart((s) => s.setStore);

  useEffect(() => {
    api
      .get(`/stores/qr/${params.qr}`)
      .then((data: { store: { id: string; tenantId: string }; spot: { id: string; spotNumber: string } }) => {
        // Save spot info to session storage
        sessionStorage.setItem('estlem_spot_id', data.spot.id);
        sessionStorage.setItem('estlem_spot_number', data.spot.spotNumber);
        setStore(data.store.id);
        router.replace(`/store/${data.store.id}?tenantId=${data.store.tenantId}`);
      })
      .catch(() => router.replace('/not-found'));
  }, [params.qr]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B4F72]">
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">جارٍ تحميل المتجر...</p>
      </div>
    </div>
  );
}
