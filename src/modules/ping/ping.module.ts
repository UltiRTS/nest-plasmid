import { Module } from '@nestjs/common';

import { PingService } from './ping.service';
import { RedisModule } from '../redis/redis.module';
import { ChatModule } from '../chat/chat.module';
import { GameModule } from '../game/game.module';

@Module({
  providers: [PingService],
  imports: [RedisModule, ChatModule, GameModule],
  exports: [PingService],
})
export class PingModule {}
