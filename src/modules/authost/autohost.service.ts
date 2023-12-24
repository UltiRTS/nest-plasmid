import { Injectable } from '@nestjs/common';

@Injectable()
export class AutohostService {
  private autohostPort: number;
  private autohostIp: string;
  setPort(newPort: number) {
    this.autohostPort = newPort;
  }
  setIp(ip: string) {
    this.autohostIp = ip;
  }

  get port() {
    return this.autohostPort;
  }

  get ip() {
    return this.autohostIp;
  }
}
