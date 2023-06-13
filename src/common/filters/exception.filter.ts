import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { WebSocket } from 'ws';

import { BaseException } from '@/common/exceptions/base.exception';

@Catch(BaseException)
export class BaseExceptionsFilter
  extends BaseWsExceptionFilter
  implements ExceptionFilter<BaseException>
{
  catch(exception: BaseException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient() as WebSocket;
    const details =
      exception instanceof Object ? { ...exception } : { message: exception };
    client.send(
      JSON.stringify({
        status: 'error',
        error: details,
      }),
    );
  }
}
