import { io, Socket } from 'socket.io-client';
import { WsEvent } from '@estlem/shared';

let socket: Socket | null = null;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('estlem_staff_token');
}

function getSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/ws`, {
      transports: ['websocket'],
      autoConnect: false,
      auth: { token: getToken() },
    });
    socket.on('connect_error', () => {
      // Retry with fresh token
      if (socket) socket.auth = { token: getToken() };
    });
  }
  return socket;
}

export function joinStoreRoom(storeId: string) {
  const s = getSocket();
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  s.emit('join:store', { storeId });
}

export function onNewOrder(cb: (data: unknown) => void) {
  getSocket().on(WsEvent.ORDER_CREATED, cb);
  return () => {
    getSocket().off(WsEvent.ORDER_CREATED, cb);
  };
}

export function onOrderStatusUpdate(cb: (data: { orderId: string; status: string }) => void) {
  getSocket().on(WsEvent.ORDER_STATUS_UPDATED, cb);
  return () => {
    getSocket().off(WsEvent.ORDER_STATUS_UPDATED, cb);
  };
}
