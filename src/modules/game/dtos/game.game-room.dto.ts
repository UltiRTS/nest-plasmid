import { uniqueId } from 'lodash';
export class GameRoom {
  notes: string;
  title: string;
  hoster: string;
  mapId: number;
  ais: { [key: string]: { team: string } };
  chickens: { [key: string]: { team: string } };
  players: { [key: string]: GameRoomPlayer };
  polls: { [key: string]: string[] };
  id: number;
  engineToken: string;
  password: string;
  isStarted: boolean;
  responsibleAutohost: string;
  autohostPort: number;
  aiHosters: string[];
  mod: string;
  constructor(data: Partial<GameRoomConstructorParams>) {
    Object.assign(this, data);
    this.engineToken = uniqueId();
  }
}

interface GameRoomConstructorParams {
  title: string;
  hoster: string;
  mapId: number;
  id: number;
  password: string;
  autohost: string;
}

export interface GameRoomPlayer {
  isSepc: boolean;
  team: string;
  hasmap: string;
}
