import { Injectable, NotImplementedException } from '@nestjs/common';
import { AutohostAddrInfo } from './autohost.types';
import { WebSocket } from 'ws';

@Injectable()
export class AutohostService {
  private autohosts: { [key: string]: AutohostAddrInfo } = {};

  registerAutohostInstance(ip: string, port: number, socket: WebSocket) {
    throw new NotImplementedException('registerAutohostInstance');
  }
}
