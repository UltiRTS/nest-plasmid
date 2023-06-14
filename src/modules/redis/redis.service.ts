import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { REDIS_CLIENT, RedisClient } from './redis.factory';

export type RedisSetOptions = {
  expire?: number;
  keepExpireTime?: boolean;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  public constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  public async get<T = any>(key: string): Promise<T> {
    return JSON.parse(await this.redis.get(key));
  }

  public async set<T = any>(
    key: string,
    value: T,
    options?: RedisSetOptions,
  ): Promise<void> {
    const _options: ({ NX: true } | {}) & { EX?: number } = Object.assign(
      options?.keepExpireTime ? { NX: true } : {},
      {
        EX: options?.expire,
      },
    );
    await this.redis.set(key, JSON.stringify(value), _options);
  }

  public async has(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  public async remove(key: string): Promise<void> {
    await this.redis.del(key);
  }

  public async lock(key: string): Promise<boolean> {
    return (
      (await this.redis.set(key, JSON.stringify(true), { NX: true })) === 'OK'
    );
  }

  public async unlock(key: string): Promise<void> {
    await this.redis.del(key);
  }

  onModuleDestroy() {
    this.redis.quit();
  }
}
