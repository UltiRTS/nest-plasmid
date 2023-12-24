import { AutoHostMessage } from '@/modules/autohost/dtos/autohost.message.dto';
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
export class AutoHostGateway extends LoggerProvider {
  constructor() {
    super();
  }

  @SubscribeMessage('workerExists')
  async workerExists(
    @MessageBody() msg: AutoHostMessage,
    @ConnectedSocket() client: WebSocketClient,
  ) {
    return null;
  }

  @SubscribeMessage('mapNotFound')
  async mapNotFound(
    @MessageBody() msg: AutoHostMessage,
    @ConnectedSocket() client: WebSocketClient,
  ) {
    return null;
  }

  @SubscribeMessage('joinRejected')
  async joinRejected(
    @MessageBody() msg: AutoHostMessage,
    @ConnectedSocket() client: WebSocketClient,
  ) {
    return null;
  }

  @SubscribeMessage('killEngineRejected')
  async killEngineRejected(
    @MessageBody() msg: AutoHostMessage,
    @ConnectedSocket() client: WebSocketClient,
  ) {
    return null;
  }

  @SubscribeMessage('serverEnding')
  async serverEnding(
    @MessageBody() msg: AutoHostMessage,
    @ConnectedSocket() client: WebSocketClient,
  ) {
    return null;
  }
}
