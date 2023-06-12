import { Module } from '@nestjs/common';

import { redisClientFactory } from './redis.factory';
import { RedisService } from './redis.service';

@Module({
  providers: [redisClientFactory, RedisService],
  exports: [RedisService],
})
export class RedisModule {}
