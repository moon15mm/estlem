import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WsEvent } from '@estlem/shared';

@WebSocketGateway({
  cors: {
    origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => {
      const ok =
        !origin ||
        /\.estlem\.store$/.test(origin) ||
        origin === 'https://estlem.store' ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin);
      cb(null, ok);
    },
  },
  namespace: '/ws',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      (client as any).user = payload;
      this.logger.debug(`WS authenticated: ${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`WS disconnect: ${client.id}`);
  }

  @SubscribeMessage('join:store')
  joinStore(@ConnectedSocket() client: Socket, @MessageBody() data: { storeId: string }) {
    const user = (client as any).user;
    if (!user || user.type !== 'staff' || user.storeId !== data.storeId) {
      return { event: 'error', data: 'Unauthorized' };
    }
    client.join(`store:${data.storeId}`);
    return { event: 'joined', data: `store:${data.storeId}` };
  }

  @SubscribeMessage('join:customer')
  joinCustomer(@ConnectedSocket() client: Socket, @MessageBody() data: { customerId: string }) {
    const user = (client as any).user;
    if (!user || (user.type === 'customer' && user.sub !== data.customerId)) {
      return { event: 'error', data: 'Unauthorized' };
    }
    client.join(`customer:${data.customerId}`);
    return { event: 'joined', data: `customer:${data.customerId}` };
  }

  emitToStore(storeId: string, event: WsEvent, data: unknown) {
    this.server.to(`store:${storeId}`).emit(event, data);
  }

  emitToCustomer(customerId: string, event: WsEvent, data: unknown) {
    this.server.to(`customer:${customerId}`).emit(event, data);
  }
}
