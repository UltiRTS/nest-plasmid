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
import { AutohostGuardModule } from '@/common/guards/auth.autohost.guard.module';
import { AutoHostGateway } from './gateways/websocket.gateway.autohost';
import { AutohostModule } from '../autohost/autohost.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoHostWhitelist } from '../autohost/autohost.whitelist.entity';

// import { ResponseTransformModule } from '../response-transform/response-transofrm.module';

@Module({
  providers: [
    GameGateway,
    UserGateway,
    ChatGateway,
    PingGateway,
    AutoHostGateway,
  ],
  imports: [
    TypeOrmModule.forFeature([AutoHostWhitelist]),
    RedisModule,
    UserModule,
    ChatModule,
    PingModule,
    GameModule,
    AutohostModule,
    ClientsModule,
    AutohostGuardModule,
  ],
})
export class WebsocketModule {}
