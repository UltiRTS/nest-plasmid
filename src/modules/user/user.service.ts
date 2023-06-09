import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash, verify } from '@ulti-rts/passlib';

import { RedisService } from '@/modules/redis/redis.service';
import {
  AuthFailedException,
  UsernameTakenException,
} from '@/common/exceptions/auth.exception';

import { User } from './user.entity';
import { randomBytes } from 'crypto';
import { UserRegisterDto } from './dtos/user.register.dto';
import { UserLoginDto } from './dtos/user.login.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: UserRegisterDto): Promise<User> {
    const { username, password } = dto;
    const lockSuccess = await this.redisService.lock(`lock:user:${username}`);
    if (!lockSuccess) {
      // lock exists, user is registering or doing something else
      throw new UsernameTakenException('This username is already taken.');
    }
    const existed = await this.userRepository.findOne({ where: { username } });
    if (existed) {
      // user already exists
      await this.redisService.unlock(`lock:user:${username}`);
      throw new UsernameTakenException('This username is already taken.');
    }
    // start registering
    const salt = randomBytes(16).toString('hex');
    const user = this.userRepository.create({
      username,
      hash: this.hashPassword(password, salt),
      salt,
    });
    const inserted = await this.userRepository.save(user);
    // finish registering
    await this.redisService.unlock(`lock:user:${username}`);
    return inserted;
  }

  async login(dto: UserLoginDto & { clientId: string }): Promise<User> {
    const { username, password, clientId } = dto;
    if (!(await this.redisService.has(`client:${clientId}`))) {
      // user is not logged in and idle for too long
      throw new AuthFailedException('Client is expired.');
    }
    const lockSuccess = await this.redisService.lock(`lock:user:${username}`);
    if (!lockSuccess) {
      // lock exists, user is registering or doing something else
      throw new AuthFailedException('Invalid username or password.');
    }
    try {
      const user = await this.userRepository.findOne({ where: { username } });
      if (!user) {
        // user does not exist
        throw new AuthFailedException('Invalid username or password.');
      }
      if (!this.verifyPassword(password, user.hash)) {
        // password is incorrect
        throw new AuthFailedException('Invalid username or password.');
      }
      if (user.blocked) {
        // user is blocked
        throw new AuthFailedException('You have been blocked.');
      }
      await this.redisService.set(
        `client:${clientId}`,
        { userId: user.id },
        { expire: 60 * 60 * 24 * 7 }, // once you logged in, you can stay for 7 days
      );
      await this.redisService.set(
        `user:${user.id}`,
        { clientId },
        { expire: 60 * 60 * 24 * 7 },
      );
      await this.redisService.unlock(`lock:user:${username}`);
      return user;
    } catch (e) {
      await this.redisService.unlock(`lock:user:${username}`);
      throw e;
    }
  }

  private hashPassword(password: string, salt: string): string {
    return hash(password, { cost: 12, salt });
  }

  private verifyPassword(password: string, hash: string): boolean {
    return verify(password, hash);
  }
}
