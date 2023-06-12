import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Confirmation } from '@/modules/confirmation/confirmation.entity';
import { Chat } from '@/modules/chat/chat.entity';
import { Adventure } from '@/modules/adventure/adventure.entity';
import { RedisModule } from '@/modules/redis/redis.module';

import { User, Mark, InventoryItem } from './user.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Confirmation,
      Chat,
      Adventure,
      Mark,
      InventoryItem,
    ]),
    RedisModule,
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
