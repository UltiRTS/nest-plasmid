import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/user/user.entity';
import { RedisModule } from '@/modules/redis/redis.module';

import { Chat, ChatRoom } from './chat.entity';
import { ChatService } from './chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatRoom, User]), RedisModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
