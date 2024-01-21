import { AutohostService } from '@/modules/autohost/autohost.service';
import { AutoHostMessage } from '@/modules/autohost/dtos/autohost.message.dto';
import { SubscribeAutohostMessage } from '@/utils/decorators.utils';
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
  constructor(private readonly autohostService: AutohostService) {
    super();
  }
  @SubscribeAutohostMessage('autohostRegister')
  async register(@ConnectedSocket() client: WebSocketClient) {
    this.logger.debug('Autohost Registering');
    this.autohostService.register(client);
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

  handleDisconnect(client: WebSocketClient) {
    this.autohostService.unregister(client);
  }
}
