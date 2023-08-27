import { Module } from '@nestjs/common';

import { PingModule } from '@/modules/ping/ping.module';
import { DatabaseModule } from '@/modules/database/database.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

import { UserModule } from '@/modules/user/user.module';
import { AdventureModule } from '@/modules/adventure/adventure.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ConfirmationModule } from '@/modules/confirmation/confirmation.module';
import { RedisModule } from '@/modules/redis/redis.module';

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
  ],
})
export class AppModule {}
