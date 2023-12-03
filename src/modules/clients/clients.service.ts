import { LoggerProvider } from '@/utils/logger.util';
import { WebSocketClient } from '@/utils/type.util';
import { Injectable } from '@nestjs/common';
@Injectable()
export class ClientsService extends LoggerProvider {
  private id2Clients: { [key: string]: WebSocketClient } = {};
  constructor() {
    super();
  }

  get(username: string): WebSocketClient | undefined {
    return this.id2Clients[username];
  }

  set(username: string, client: WebSocketClient) {
    this.id2Clients[username] = client;
  }
  remove(username: string) {
    delete this.id2Clients[username];
  }
}
