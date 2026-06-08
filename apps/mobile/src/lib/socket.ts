import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../stores/useAuth';
import { getStatusLabel } from './utils';

const WS_URL = 'https://api.estlem.store/ws';

let socket: Socket | null = null;

// ── listeners registry ───────────────────────────────────────────
type OrderEvent = {
  orderId: string;
  orderNumber?: string;
  status?: string;
  estimatedMins?: number;
};

type Listener = (data: OrderEvent) => void;
const listeners = new Set<Listener>();

export function onOrderUpdate(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notifyListeners(data: OrderEvent) {
  listeners.forEach((fn) => fn(data));
}

// ── human-readable notification ──────────────────────────────────
const STATUS_MESSAGES: Record<string, string> = {
  pending_approval: 'تم تسعير طلبك — راجع السعر ووافق عليه',
  new: 'تم استلام طلبك وسيبدأ التحضير قريباً',
  accepted: 'تم قبول طلبك وبدأ التحضير',
  preparing: 'جاري تحضير طلبك الآن',
  ready: 'طلبك جاهز للاستلام! 🎉',
  delivered: 'تم توصيل طلبك — شكراً لك!',
  cancelled: 'تم إلغاء الطلب',
};

function showStatusAlert(data: OrderEvent) {
  if (!data.status) return;
  const msg = STATUS_MESSAGES[data.status];
  if (!msg) return;
  const title = `طلب ${data.orderNumber ?? ''}`;
  Alert.alert(title, msg);
}

// ── connect / disconnect ─────────────────────────────────────────
async function connect() {
  if (socket?.connected) return;

  const token = await SecureStore.getItemAsync('estlem_token');
  if (!token) return;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
  });

  socket.on('connect', () => {
    console.log('[WS] connected');
    // Join customer room
    const sessionStr = SecureStore.getItemAsync('estlem_session');
    sessionStr.then((s) => {
      if (!s) return;
      try {
        const session = JSON.parse(s);
        if (session.user?.id) {
          socket?.emit('join:customer', { customerId: session.user.id });
        }
      } catch {}
    });
  });

  // Order events
  socket.on('order:status_updated', (data: OrderEvent) => {
    console.log('[WS] order:status_updated', data);
    showStatusAlert(data);
    notifyListeners(data);
  });

  socket.on('order:quote_ready', (data: any) => {
    console.log('[WS] order:quote_ready', data);
    const event: OrderEvent = {
      orderId: data.id ?? data.orderId,
      orderNumber: data.orderNumber,
      status: 'pending_approval',
    };
    showStatusAlert(event);
    notifyListeners(event);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] disconnected:', reason);
  });
}

function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// ── React hook: manages lifecycle ────────────────────────────────
export function useSocket() {
  const session = useAuth((s) => s.session);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!session?.accessToken) {
      disconnect();
      return;
    }

    connect();

    // Reconnect when app returns to foreground
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        connect();
      }
      appState.current = next;
    });

    return () => {
      sub.remove();
      disconnect();
    };
  }, [session?.accessToken]);
}
