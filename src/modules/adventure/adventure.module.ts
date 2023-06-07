import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/user/user.entity';

import { Adventure } from './adventure.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Adventure, User])],
})
export class AdventureModule {}
