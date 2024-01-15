import { AutoHostWhitelist } from './../../modules/autohost/autohost.whitelist.entity';
import { WebSocketClient } from '@/utils/type.util';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AutoHostGuard implements CanActivate {
  constructor(
    @InjectRepository(AutoHostWhitelist)
    private readonly whitelistRepo: Repository<AutoHostWhitelist>,
  ) {
    whitelistRepo.find().then((list) => {
      list.forEach((safeHost) => {
        this.whiteListSet.add(safeHost.ip);
      });
    });
  }

  private readonly whiteListSet: Set<string> = new Set();

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const client = context.switchToWs().getClient<WebSocketClient>();
    return this.whiteListSet.has(client._socket.remoteAddress);
  }
}
