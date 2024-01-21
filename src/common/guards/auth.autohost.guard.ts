import { LoggerProvider } from '@/utils/logger.util';
import { AutoHostWhitelist } from './../../modules/autohost/autohost.whitelist.entity';
import { WebSocketClient } from '@/utils/type.util';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AutoHostGuard extends LoggerProvider implements CanActivate {
  constructor(
    @InjectRepository(AutoHostWhitelist)
    private readonly whitelistRepo: Repository<AutoHostWhitelist>,
  ) {
    super();
    whitelistRepo.find().then((list) => {
      list.forEach((safeHost) => {
        this.whiteListSet.add(safeHost.ip);
      });
    });
  }

  private readonly whiteListSet: Set<string> = new Set(['::ffff:127.0.0.1']);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const client = context.switchToWs().getClient<WebSocketClient>();
    const res = this.whiteListSet.has(client._socket.remoteAddress);
    if (!res) {
      this.logger.warn(
        `AutoHostGuard: client ${client._socket.remoteAddress} isn't in whitelist`,
      );
      client.send(
        JSON.stringify({
          action: 'error',
          message: 'Unauthorized',
        }),
      );
    }
    return res;
  }
}
