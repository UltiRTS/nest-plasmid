import { Injectable } from '@nestjs/common';
import { PingResponse } from './ping.entity';

@Injectable()
export class PingService {
  async ping(): Promise<PingResponse> {
    return {
      action: 'PONG',
      parameters: {},
    };
  }
}
