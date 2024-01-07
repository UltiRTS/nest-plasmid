import { Module } from '@nestjs/common';
import { AutohostService } from './autohost.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoHostWhitelist } from './autohost.whitelist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AutoHostWhitelist])],
  providers: [AutohostService],
  exports: [AutohostService],
})
export class AutohostModule {}
