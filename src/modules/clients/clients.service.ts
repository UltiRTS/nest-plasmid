import { LoggerProvider } from '@/utils/logger.util';
import { WebSocketClient } from '@/utils/type.util';
import { Injectable } from '@nestjs/common';
@Injectable()
export class ClientsService extends LoggerProvider {
  private id2Clients: { [key: string]: WebSocketClient } = {};
  constructor() {
    super();
  }
  get(usernames: string[]): WebSocketClient[];
  get(username: string): WebSocketClient | undefined;
  get(arg: any) {
    if (Array.isArray(arg)) {
      return arg.filter(a => a in this.id2Clients).map(a => this.id2Clients[a]);
    }
    if (typeof arg === "string") {
      return this.id2Clients[arg]
    }
  }

  set(username: string, client: WebSocketClient) {
    this.id2Clients[username] = client;
  }
  remove(username: string) {
    delete this.id2Clients[username];
  }
}
