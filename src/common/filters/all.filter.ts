import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { WebSocket } from 'ws';

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const client = host.switchToWs().getClient() as WebSocket;
    const details = error instanceof Object ? { ...error } : { message: error };
    client.send(
      JSON.stringify({
        status: 'error',
        error: { ...details, code: 'UNKNOWN' },
      }),
    );
  }
}
