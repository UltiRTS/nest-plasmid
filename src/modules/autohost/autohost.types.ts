import Game from '../game/game.entity';
import WebSocket from 'ws';
export interface AutohostResponse {
  action: string;
  parameters: {
    info?: string;
    title?: string;
    status?: boolean;
    id?: number;
  };
}

export interface AutohostAddrInfo {
  addr: string;
  port: number;
  socket: WebSocket;
}

export interface HostedGame {
  autohost: string;
  running: boolean;
  error: string;
  ws: WebSocket;
  game: Game;
  lostMarks: {
    [key: number]: {
      team: number;
      lost: boolean;
      name: string;
      isPlayer: boolean;
    };
  };
}
