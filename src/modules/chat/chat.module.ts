import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/user/user.entity';

import { Chat, ChatRoom } from './chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatRoom, User])],
})
export class ChatModule {}
