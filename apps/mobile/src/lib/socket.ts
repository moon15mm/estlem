import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../stores/useAuth';

const WS_URL = 'https://api.estlem.store';

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
  pending_quote: 'تم استلام طلبك — بانتظار تسعير المحل',
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
  const num = data.orderNumber ? ` ${data.orderNumber}` : '';
  Alert.alert(`طلب${num}`, msg);
}

// ── connect / disconnect ─────────────────────────────────────────
async function connect() {
  if (socket?.connected) return;

  const token = await SecureStore.getItemAsync('estlem_token');
  if (!token) return;

  // Disconnect old socket if exists
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(`${WS_URL}/ws`, {
    auth: { token },
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    timeout: 10000,
    forceNew: true,
  });

  socket.on('connect', async () => {
    console.log('[WS] connected, id:', socket?.id);
    // Join customer room
    try {
      const s = await SecureStore.getItemAsync('estlem_session');
      if (s) {
        const session = JSON.parse(s);
        if (session.user?.id) {
          socket?.emit('join:customer', { customerId: session.user.id });
          console.log('[WS] joined customer room:', session.user.id);
        }
      }
    } catch (e) {
      console.warn('[WS] failed to join room', e);
    }
  });

  // Order status changes
  socket.on('order:status_updated', (data: OrderEvent) => {
    console.log('[WS] order:status_updated', JSON.stringify(data));
    showStatusAlert(data);
    notifyListeners(data);
  });

  // Store sent a quote
  socket.on('order:quote_ready', (data: any) => {
    console.log('[WS] order:quote_ready', JSON.stringify(data));
    const event: OrderEvent = {
      orderId: data.id ?? data.orderId,
      orderNumber: data.orderNumber,
      status: 'pending_approval',
    };
    showStatusAlert(event);
    notifyListeners(event);
  });

  // Order created (confirmation)
  socket.on('order:created', (data: any) => {
    console.log('[WS] order:created', JSON.stringify(data));
    const event: OrderEvent = {
      orderId: data.id ?? data.orderId,
      orderNumber: data.orderNumber,
      status: data.status,
    };
    notifyListeners(event);
  });

  socket.on('connect_error', (err) => {
    console.warn('[WS] connect_error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] disconnected:', reason);
  });

  socket.on('reconnect', (attempt) => {
    console.log('[WS] reconnected after', attempt, 'attempts');
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
        if (!socket?.connected) {
          connect();
        }
      }
      appState.current = next;
    });

    return () => {
      sub.remove();
      disconnect();
    };
  }, [session?.accessToken]);
}
