import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  async check(): Promise<string> {
    return 'ok';
  }
}
