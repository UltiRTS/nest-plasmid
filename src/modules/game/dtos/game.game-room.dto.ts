import { uniqueId } from 'lodash';
export class GameRoom {
  notes = '';
  title = '';
  hoster = '';
  mapId = 0;
  ais: { [key: string]: { team: string } } = {};
  chickens: { [key: string]: { team: string } } = {};
  players: { [key: string]: GameRoomPlayer } = {};
  polls: { [key: string]: string[] } = {};
  id: number;
  engineToken = '';
  password = '';
  isStarted = false;
  responsibleAutohost = '';
  autohostPort = 0;
  aiHosters: string[] = [];
  mod = '';
  constructor(data: Partial<GameRoomConstructorParams>) {
    Object.assign(this, data);
    this.engineToken = uniqueId();
    this.players = {};
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
  isSepctator: boolean;
  team: string;
  hasmap: boolean;
}
