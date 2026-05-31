import { io, Socket } from 'socket.io-client';
import { WsEvent } from '@estlem/shared';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/ws`, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function joinStoreRoom(storeId: string) {
  const s = getSocket();
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
