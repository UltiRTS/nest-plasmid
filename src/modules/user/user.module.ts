import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Confirmation } from '@/modules/confirmation/confirmation.entity';
import { Chat } from '@/modules/chat/chat.entity';
import { Adventure } from '@/modules/adventure/adventure.entity';

import { User, Mark, InventoryItem } from './user.entity';

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
  ],
})
export class UserModule {}
