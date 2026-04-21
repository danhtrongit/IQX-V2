import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Trong thực tế nên config mảng origin
  },
  namespace: '/market',
})
export class MarketDataGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MarketDataGateway');
  private connectedClients = 0;

  afterInit(_server: Server) {
    this.logger.log('MarketDataGateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.debug(
      `Client connected: ${client.id}. Total connected clients: ${this.connectedClients}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.debug(
      `Client disconnected: ${client.id}. Total connected clients: ${this.connectedClients}`,
    );
  }

  /**
   * Broadcast mảng dữ liệu tóm tắt chỉ số (VNINDEX, HNX...) qua socket
   */
  broadcastMarketIndices(data: any[]) {
    if (this.connectedClients > 0) {
      this.server.emit('market_indices_update', data);
    }
  }
}
