import { Module } from '@nestjs/common';

import { RedisModule } from '@/modules/redis/redis.module';
import { UserModule } from '@/modules/user/user.module';
import { ChatModule } from '@/modules/chat/chat.module';

import { GameGateway } from './gateways/websocket.gateway.game';
import { PingModule } from '../ping/ping.module';
import { GameModule } from '../game/game.module';
import { ClientsModule } from '../clients/clients.module';
import { UserGateway } from './gateways/websocket.gateways.user';
import { ChatGateway } from './gateways/websocket.gateways.chat';
import { PingGateway } from './gateways/websocket.gateway.ping';
import { BroadcastModule } from '../queues/queues.module';
import { BullModule } from '@nestjs/bull';
// import { ResponseTransformModule } from '../response-transform/response-transofrm.module';

@Module({
  providers: [GameGateway, UserGateway, ChatGateway, PingGateway],
  imports: [
    BullModule.registerQueue({
      name: 'messages',
    }),
    RedisModule,
    UserModule,
    ChatModule,
    PingModule,
    GameModule,
    ClientsModule,
  ],
})
export class WebsocketModule {}
