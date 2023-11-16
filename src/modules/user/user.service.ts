import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash, verify } from '@ulti-rts/passlib';
import _ from 'lodash';
import { RedisService } from '@/modules/redis/redis.service';
import {
  LoginException,
  RegisterException,
} from '@/common/exceptions/auth.exception';

import { User } from './user.entity';
import { randomBytes } from 'crypto';
import { UserRegisterDto } from './dtos/user.register.dto';
import { UserLoginDto } from './dtos/user.login.dto';
import { UserState } from '../redis/dtos/redis.user.dto';
import { Adventure } from '../adventure/adventure.entity';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Adventure)
    private readonly adventureRepository: Repository<Adventure>,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: UserRegisterDto): Promise<User> {
    const { username, password } = dto;
    try {
      const lockSuccess = await this.redisService.lock(`lock:user:${username}`);
      if (!lockSuccess) {
        // lock exists, user is registering or doing something else
        throw new RegisterException('This username is already taken.');
      }
      const existed = await this.userRepository.findOne({
        where: { username },
      });
      if (existed) {
        // user already exists
        await this.redisService.unlock(`lock:user:${username}`);
        throw new RegisterException('This username is already taken.');
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
    } finally {
      await this.redisService.unlock(`lock:user${username}`);
    }
  }

  async login(dto: UserLoginDto & { clientId: string }): Promise<User> {
    const { username, password, clientId } = dto;
    try {
      if (!(await this.redisService.has(`client:${clientId}`))) {
        // user is not logged in and idle for too long
        throw new LoginException('Client is expired.');
      }
      const lockSuccess = await this.redisService.lock(`lock:user:${username}`);
      const stateLockSuccess = await this.redisService.lock(
        `lock:userState:${username}`,
      );

      if (!lockSuccess || !stateLockSuccess) {
        // lock exists, user is registering or doing something else
        throw new LoginException('Invalid username or password.');
      }

      const user = await this.userRepository.findOne({
        where: { username },
        relations: {
          friends: true,
          confirmations: true,
          chats: true,
          adventures: true,
          marks: true,
          reverseMarks: true,
          inventory: true,
        },
      });

      if (!user) {
        // user does not exist
        throw new LoginException('Invalid username or password.');
      }
      if (!this.verifyPassword(password, user.hash)) {
        // password is incorrect
        throw new LoginException('Invalid username or password.');
      }
      if (user.blocked) {
        // user is blocked
        throw new LoginException('You have been blocked.');
      }
      // Prepare user state for Redis
      user.confirmations = user.confirmations.filter((c) => !c.claimed);
      const userState = UserState.from(user);
      // let adv = await this.findAdventure(userState.adventure);
      await this.redisService.set(`userState:${username}`, userState);

      await this.userRepository.save(user);
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
      return user;
    } catch (e) {
      throw e;
    } finally {
      await this.redisService.unlock(`lock:userState:${username}`);
      await this.redisService.unlock(`lock:user:${username}`);
    }
  }

  private hashPassword(password: string, salt: string): string {
    return hash(password, { cost: 12, salt });
  }

  private verifyPassword(password: string, hash: string): boolean {
    return verify(password, hash);
  }

  private async findAdventure(id: number): Promise<Adventure | null> {
    let adv = await this.redisService.get(`adventure:${id}`);
    if (adv) {
      return adv;
    }
    // Add Adventure State to redis, see the link below fo details
    // https://github.com/UltiRTS/ts-plasmid/blob/redis/lib/states/rougue/adventure.ts
    adv = await this.adventureRepository.findOne({ where: { id } });
    if (adv) {
      await this.redisService.set(`adventure:${id}`, adv);
    }
  }
}
