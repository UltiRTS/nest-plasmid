import { Module } from '@nestjs/common';

import { RedisModule } from '@/modules/redis/redis.module';
import { UserModule } from '@/modules/user/user.module';

import { WebsocketGateway } from './websocket.gateway';

@Module({
  providers: [WebsocketGateway],
  imports: [RedisModule, UserModule],
})
export class WebsocketModule {}
