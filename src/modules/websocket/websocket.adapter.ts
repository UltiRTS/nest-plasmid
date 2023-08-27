import { INestApplicationContext } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import { WsAdapter } from '@nestjs/platform-ws';
import {
  Observable,
  EMPTY,
  filter,
  first,
  fromEvent,
  mergeMap,
  share,
  takeUntil,
  map,
  from,
  firstValueFrom,
} from 'rxjs';
import { OPEN } from 'ws';
import { isNil, attempt, isError } from 'lodash';
import { instanceToPlain } from 'class-transformer';

export class WebsocketAdapter extends WsAdapter {
  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  public bindMessageHandlers(
    client: any,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const close$ = fromEvent(client, 'close').pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap((data) =>
        this.bindMessageHandler(data, handlers, transform).pipe(
          filter((result) => !isNil(result)),
        ),
      ),
      takeUntil(close$),
    );
    const onMessage = (data: any) => {
      if (client.readyState !== OPEN) {
        return;
      }
      client.send(JSON.stringify(data));
    };

    source$.subscribe(onMessage);
  }

  bindMessageHandler(
    buffer,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ): Observable<any> {
    this.logger.log(`received message: ${buffer.data}`);
    const message = attempt(JSON.parse, buffer.data);
    if (isError(message)) {
      return process({
        status: 'error',
        error: { code: 'JSON_ERROR', message: 'Invalid JSON message' },
      });
    }
    const { seq, action } = message;

    const messageHandler = handlers.find(
      (handler) => handler.message === action,
    );
    if (!messageHandler) {
      return EMPTY;
    }
    const result = messageHandler.callback({ ...message.parameters, seq });

    return process(
      firstValueFrom(
        from(result)
          .pipe(filter((result) => !isNil(result)))
          .pipe(map((result) => instanceToPlain(result)))
          .pipe(
            map((result) => ({
              action: action,
              data: result,
              seq,
            })),
          ),
      ).catch(/* ignore error here */ () => undefined),
    );
  }
}
