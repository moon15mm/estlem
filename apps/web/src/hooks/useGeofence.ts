'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface NearbyStore {
  id: string;
  nameAr: string;
  tenantId: string;
  distance: number;
  geofenceRadius: number;
}

export function useGeofence() {
  const watchId = useRef<number | null>(null);
  const notifiedStores = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only run in browser with geolocation support
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    // Load previously notified stores from session
    const stored = sessionStorage.getItem('estlem_notified_stores');
    if (stored) {
      try {
        notifiedStores.current = new Set(JSON.parse(stored));
      } catch { /* ignore */ }
    }

    // Check permission first - don't request if not already granted
    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      if (result.state !== 'granted') return;

      watchId.current = navigator.geolocation.watchPosition(
        async (pos) => {
          try {
            const stores = await api.get(
              `/stores/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=0.5&limit=5`,
            ) as NearbyStore[];

            if (!Array.isArray(stores)) return;

            for (const store of stores) {
              const radiusKm = (store.geofenceRadius || 200) / 1000;
              if (store.distance <= radiusKm && !notifiedStores.current.has(store.id)) {
                notifiedStores.current.add(store.id);
                sessionStorage.setItem(
                  'estlem_notified_stores',
                  JSON.stringify([...notifiedStores.current]),
                );

                toast(
                  `أنت بالقرب من ${store.nameAr}! اطلب الآن`,
                  {
                    duration: 6000,
                    icon: '📍',
                    style: { direction: 'rtl', fontWeight: 'bold' },
                  },
                );
              }
            }
          } catch { /* silent */ }
        },
        () => { /* ignore errors */ },
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 },
      );
    });

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);
}
