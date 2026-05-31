import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsEvent } from '@estlem/shared';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`WS connect: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WS disconnect: ${client.id}`);
  }

  // Client joins a store room (staff)
  @SubscribeMessage('join:store')
  joinStore(@ConnectedSocket() client: Socket, @MessageBody() data: { storeId: string }) {
    client.join(`store:${data.storeId}`);
    return { event: 'joined', data: `store:${data.storeId}` };
  }

  // Client joins their own customer room
  @SubscribeMessage('join:customer')
  joinCustomer(@ConnectedSocket() client: Socket, @MessageBody() data: { customerId: string }) {
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
