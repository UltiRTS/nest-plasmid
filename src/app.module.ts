import { Module } from '@nestjs/common';

import { PingModule } from '@/modules/ping/ping.module';
import { DatabaseModule } from '@/modules/database/database.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

import { UserModule } from '@/modules/user/user.module';
import { AdventureModule } from '@/modules/adventure/adventure.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ConfirmationModule } from '@/modules/confirmation/confirmation.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { BullModule } from "@nestjs/bull";
import { useConfig } from './utils/config.util';
const config = useConfig()
const [redisHost, redisPort] = config.redis.url;
const AppBullModule = BullModule.forRoot({
  redis: {
      host: redisHost,
      port: parseInt(redisPort)
  }
})
@Module({
  imports: [
    // components
    RedisModule,
    DatabaseModule,
    PingModule,
    WebsocketModule,
    // business
    UserModule,
    AdventureModule,
    ChatModule,
    ConfirmationModule,
    AppBullModule,
  ],
})
export class AppModule {}
