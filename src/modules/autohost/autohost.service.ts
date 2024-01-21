import { Injectable } from '@nestjs/common';

import { WebSocketClient } from '@/utils/type.util';
import { LoggerProvider } from '@/utils/logger.util';

@Injectable()
export class AutohostService extends LoggerProvider {
  constructor() {
    super();
  }
  private autohosts: { [key: string]: WebSocketClient } = {};
  register(socket: WebSocketClient) {
    this.autohosts[socket._socket.remoteAddress] = socket;
    this.logger.log(`Registered autohost ${socket._socket.remoteAddress}`);
  }

  unregister(socket: WebSocketClient) {
    if (
      socket._socket.remoteAddress in this.autohosts &&
      this.autohosts[socket._socket.remoteAddress] == socket
    )
      delete this.autohosts[socket._socket.remoteAddress];

    this.logger.log(`Unregistered autohost ${socket._socket.remoteAddress}`);
  }
}
