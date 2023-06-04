import { Worker } from 'node:worker_threads';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { useConfig } from '@/utils/config.util';
import { User } from '@/modules/user/user.entity';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const config = useConfig();
  }
}
