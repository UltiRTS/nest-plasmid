import { IsNotEmpty, IsNumber } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';
import { Mark, User } from '../user.entity';
import { Adventure } from '@/modules/adventure/adventure.entity';
import { Confirmation } from '@/modules/confirmation/confirmation.entity';
import { ChatRoom } from '@/modules/chat/chat.entity';
import { OverridesField as OverrideFields } from '@/utils/type.util';

export class UserDumpDto {
  @ApiProperty({ example: 114514, description: 'Id' })
  @IsNumber({}, { message: '`id` must be a number' })
  @IsNotEmpty({ message: '`id` cannot be empty' })
  id: number;
}

interface UserAlteredField {
  rglike: Adventure | null;
  confirmations: Omit<Confirmation, 'user'>[];
  friends: string[];
  friendsOnline: string[];
  firendsMarked: OverrideFields<Mark, { name: string }, 'user' | 'target'>[];
  chatRooms: {
    [key: string]: ChatRoom;
  };
}

export type DumpableUser = OverrideFields<
  User,
  UserAlteredField,
  'salt' | 'hash' | 'marks' | 'adventures' | 'chats' | 'reverseMarks'
>;
