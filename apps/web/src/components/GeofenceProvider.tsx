'use client';

import { useGeofence } from '@/hooks/useGeofence';

export function GeofenceProvider() {
  useGeofence();
  return null;
}
