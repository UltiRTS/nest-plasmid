import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Game } from '@/modules/game/game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
})
export class GameModule {}
