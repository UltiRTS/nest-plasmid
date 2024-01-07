import { Module } from '@nestjs/common';

import { PingModule } from '@/modules/ping/ping.module';
import { DatabaseModule } from '@/modules/database/database.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

import { UserModule } from '@/modules/user/user.module';
import { AdventureModule } from '@/modules/adventure/adventure.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ConfirmationModule } from '@/modules/confirmation/confirmation.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { BullModule } from '@nestjs/bull';
import { useConfig } from './utils/config.util';
import { AutohostModule } from './modules/autohost/autohost.module';
const config = useConfig();
const redisUrl = new URL(config.redis.url);
console.log('redisHost', redisUrl.hostname);
console.log(redisUrl.hostname, redisUrl.port);
const AppBullModule = BullModule.forRoot({
  redis: {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port),
    path: '1',
  },
});
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
    AutohostModule,
  ],
})
export class AppModule {}
