import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { WebSocket } from 'ws';

@Catch(WsException)
export class WebsocketExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient() as WebSocket;
    const error = exception.getError();
    const details = error instanceof Object ? { ...error } : { message: error };
    client.send(
      JSON.stringify({
        status: 'error',
        error: { ...details, code: 'UNKNOWN' },
      }),
    );
  }
}
