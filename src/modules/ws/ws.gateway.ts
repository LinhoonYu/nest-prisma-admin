import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AppLogger } from '~/common/logger/app-logger';
import { TokenService } from '~/modules/auth/token.service';
import { SessionService } from '~/modules/auth/session.service';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  sessionId: string;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
})
export class WsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private tokenService: TokenService,
    private sessionService: SessionService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(WsGateway.name);
  }

  afterInit() {
    this.logger.info('WebSocket Gateway 初始化完成');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const authToken = this.extractToken(client);

      if (!authToken) {
        this.logger.warn(`客户端 ${client.id} 连接被拒绝：缺少 token`);
        client.emit('error', { code: 401, message: '请先登录' });
        client.disconnect(true);
        return;
      }

      const payload = await this.tokenService.verifyAccess(authToken);

      const active = await this.sessionService.isActive(payload.sessionId);
      if (!active) {
        this.logger.warn(`客户端 ${client.id} 连接被拒绝：会话已失效`);
        client.emit('error', { code: 401, message: '会话已失效，请重新登录' });
        client.disconnect(true);
        return;
      }

      const authedSocket = client as AuthenticatedSocket;
      authedSocket.userId = payload.userId;
      authedSocket.sessionId = payload.sessionId;

      await client.join(`user:${payload.userId}`);

      this.broadcastOnlineCount();

      this.logger.info(
        `客户端 ${client.id} 已连接 (userId=${payload.userId}, sessionId=${payload.sessionId})`,
      );
    } catch (err) {
      this.logger.warn(
        `客户端 ${client.id} 连接鉴权失败: ${(err as Error).message}`,
      );
      client.emit('error', { code: 401, message: '令牌无效或已过期' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const authedSocket = client as AuthenticatedSocket;
    if (authedSocket.userId) {
      this.logger.info(
        `客户端 ${client.id} 已断开 (userId=${authedSocket.userId})`,
      );
      setTimeout(() => this.broadcastOnlineCount(), 1000);
    } else {
      this.logger.info(`客户端 ${client.id} 已断开（未认证）`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  broadcast(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToUsers(
    userIds: (number | string)[],
    event: string,
    data: unknown,
  ): void {
    if (!userIds.length) return;
    const rooms = userIds.map((id) => `user:${id}`);
    this.server.to(rooms).emit(event, data);
  }

  private broadcastOnlineCount(): void {
    const sockets = this.server?.sockets?.sockets;
    if (!sockets) return;

    const count = Array.from(sockets.values()).filter(
      (socket) => !!(socket as AuthenticatedSocket).userId,
    ).length;
    this.server.emit('online-count', count);
  }

  private extractToken(client: Socket): string | null {
    const { auth, query } = client.handshake;

    let rawToken: unknown = auth?.token;
    if (!rawToken) {
      rawToken = query?.token;
    }

    if (typeof rawToken !== 'string' || !rawToken) return null;
    return rawToken.replace(/^Bearer\s+/i, '');
  }
}
