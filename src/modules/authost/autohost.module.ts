import { Module } from '@nestjs/common';
import { AutohostService } from './autohost.service';

@Module({
  providers: [AutohostService],
  exports: [AutohostService],
})
export class AutohostModule {}
