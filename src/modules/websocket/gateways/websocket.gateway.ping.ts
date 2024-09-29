import { PingResponse } from '@/modules/ping/ping.entity';
import { PingService } from '@/modules/ping/ping.service';
import { LoggerProvider } from '@/utils/logger.util';
import { WebSocketClient } from '@/utils/type.util';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PingGateway extends LoggerProvider {
  constructor(private readonly pingService: PingService) {
    super();
  }

  @SubscribeMessage('PING')
  async ping(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<PingResponse> {
    return this.pingService.ping(client.username);
  }
}
