import { useConfig } from '@/utils/config.util';
import { FactoryProvider } from '@nestjs/common';
import { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisClientFactory: FactoryProvider<Promise<RedisClient>> = {
  provide: REDIS_CLIENT,
  useFactory: async () => {
    const config = useConfig();
    const client = createClient({ url: config.redis.url });
    await client.connect();
    return client;
  },
};
