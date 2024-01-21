import { AutoHostWhitelist } from '@/modules/autohost/autohost.whitelist.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoHostGuard as AutohostGuard } from './auth.autohost.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AutoHostWhitelist])],
  providers: [AutohostGuard],
})
export class AutohostGuardModule {}
