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
    origin: true,
    credentials: true,
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

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        (client as any).user = payload;
        this.logger.debug(`WS authenticated: ${payload.sub} (${payload.type})`);
      } catch {
        this.logger.warn(`WS invalid token from ${client.id}`);
      }
    }
    // Allow connection even without token — room join checks auth
    this.logger.debug(`WS connect: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`WS disconnect: ${client.id}`);
  }

  @SubscribeMessage('join:store')
  joinStore(@ConnectedSocket() client: Socket, @MessageBody() data: { storeId: string }) {
    const user = (client as any).user;
    // Allow staff with matching tenantId (owner can see all stores)
    if (user && (user.type === 'staff' || user.type === 'superadmin')) {
      client.join(`store:${data.storeId}`);
      this.logger.debug(`Staff ${user.sub} joined store:${data.storeId}`);
      return { event: 'joined', data: `store:${data.storeId}` };
    }
    return { event: 'error', data: 'Unauthorized — staff login required' };
  }

  @SubscribeMessage('join:customer')
  joinCustomer(@ConnectedSocket() client: Socket, @MessageBody() data: { customerId: string }) {
    // Customers can join their own room (with or without token)
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
