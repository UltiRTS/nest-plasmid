import { LoggerProvider } from '@/utils/logger.util';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { from, map, Observable } from 'rxjs';
import { WsResponse } from '@nestjs/websockets';

import { Server } from 'socket.io';

// TODO: remove cors on production
// You can test this in https://www.piesocket.com/socketio-tester
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway extends LoggerProvider {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('event')
  handleEvent(@MessageBody() data: string): Observable<WsResponse<string>> {
    this.logger.log(`Received event: ${JSON.stringify(data)}`);
    return from([data]).pipe(map((item) => ({ event: 'event', data: item })));
  }

  afterInit() {
    this.logger.log('Websocket Server Initialized');
  }
}
