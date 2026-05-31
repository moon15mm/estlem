import { io, Socket } from 'socket.io-client';
import { WsEvent } from '@estlem/shared';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/ws`, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function joinCustomerRoom(customerId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('join:customer', { customerId });
}

export function joinStoreRoom(storeId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('join:store', { storeId });
}

export function onOrderStatusUpdate(
  cb: (data: { orderId: string; status: string; estimatedMins?: number }) => void,
): VoidFunction {
  getSocket().on(WsEvent.ORDER_STATUS_UPDATED, cb);
  return function cleanupOrderStatusUpdate(): void {
    getSocket().off(WsEvent.ORDER_STATUS_UPDATED, cb);
  };
}

export function onNewOrder(cb: (data: unknown) => void): VoidFunction {
  getSocket().on(WsEvent.ORDER_CREATED, cb);
  return function cleanupNewOrder(): void {
    getSocket().off(WsEvent.ORDER_CREATED, cb);
  };
}
