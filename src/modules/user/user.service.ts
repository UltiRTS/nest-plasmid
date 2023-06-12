import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash, verify } from '@ulti-rts/passlib';

import { RedisService } from '@/modules/redis/redis.service';

import { User } from './user.entity';
import { WsException } from '@nestjs/websockets';
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
      throw new WsException('This username is already taken.');
    }
    const existed = await this.userRepository.findOne({ where: { username } });
    if (existed) {
      // user already exists
      await this.redisService.unlock(`lock:user:${username}`);
      throw new WsException('This username is already taken.');
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

  async login(dto: UserLoginDto): Promise<User> {
    const { username, password } = dto;
    const lockSuccess = await this.redisService.lock(`lock:user:${username}`);
    if (!lockSuccess) {
      // lock exists, user is registering or doing something else
      throw new WsException('Invalid username or password.');
    }
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      // user does not exist
      await this.redisService.unlock(`lock:user:${username}`);
      throw new WsException('Invalid username or password.');
    }
    if (!this.verifyPassword(password, user.hash)) {
      // password is incorrect
      await this.redisService.unlock(`lock:user:${username}`);
      throw new WsException('Invalid username or password.');
    }
    if (user.blocked) {
      // user is blocked
      await this.redisService.unlock(`lock:user:${username}`);
      throw new WsException('You have been blocked.');
    }
    await this.redisService.unlock(`lock:user:${username}`);
    return user;
  }

  private hashPassword(password: string, salt: string): string {
    return hash(password, { cost: 15, salt });
  }

  private verifyPassword(password: string, hash: string): boolean {
    return verify(password, hash);
  }
}
