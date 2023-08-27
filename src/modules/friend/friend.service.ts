import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { FriendMarkDto } from './dtos/friend.mark.dto';

@Injectable()
class FriendService {
  constructor(
    @InjectRepository(User)
    private readonly UserRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async mark(dto: FriendMarkDto) {}
}
