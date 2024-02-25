import { ArgumentsHost, Catch, Injectable } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { BroadcastException } from '../exceptions/base.exception';

@Catch(BroadcastException)
@Injectable()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const client = host.switchToWs().getClient() as WebSocket;
    const { seq } = host.switchToWs().getData();
    const details = error instanceof Object ? { ...error } : { message: error };
    console.error('Error:', { error });
    client.send(
      JSON.stringify({
        action: 'NOTIFY',
        error: { ...details, code: 'UNKNOWN' },
        seq,
      }),
    );
  }
}
