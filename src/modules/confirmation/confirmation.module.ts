import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/user/user.entity';

import { Confirmation } from './confirmation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Confirmation, User])],
})
export class ConfirmationModule {}
