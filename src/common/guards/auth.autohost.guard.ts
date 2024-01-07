import { WebSocketClient } from '@/utils/type.util';
import { CanActivate, ExecutionContext } from '@nestjs/common';

export class AutoHostGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const client = context.switchToWs().getClient<WebSocketClient>();
    return !!client.userId;
  }
}
