import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/modules/user/user.entity';

import { BusinessService } from './business.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [BusinessService],
})
export class BusinessModule {}
