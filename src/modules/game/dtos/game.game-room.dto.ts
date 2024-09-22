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
  mod = 'mod.sdd';
  prespawns: {[key: number]: PreSpawn};
  constructor(data: Partial<GameRoomConstructorParams>) {
    Object.assign(this, data);
    // this.engineToken = uniqueId();
    this.players = {};
    this.prespawns = {
      0: {
        owner: 'test',
        unitName: 'pw_grid',
        coordinates: [0, 0]
      }
    };
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
  isSpec: boolean;
  team: string;
  hasmap: boolean;
}

export interface PreSpawn {
  unitName: string;
  coordinates: number[];
  owner: string
}
