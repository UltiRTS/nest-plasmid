import { Injectable, NotImplementedException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JoinGameDto } from './dtos/game.join.dto';
import { GameRoom } from './dtos/game.game-room.dto';
import { SetMapDto } from './dtos/game.set-map.dto';
import { SetModDto } from './dtos/game.set-mod.dto';
import {
  GameRoomException,
  JoinGameExcption,
} from '@/common/exceptions/game.exception';
import { v4 as uuidv4 } from 'uuid';
import { SetTeamDto } from './dtos/game.set-team.dto';
import { UserState } from '../redis/dtos/redis.user.dto';
import { SetAiDto } from './dtos/game.set-ai.dto';
import { SetSepctatorDto } from './dtos/game.set-spectator.dto';
import { StartGameDto } from './dtos/game.start-game.dto';
import { BroadcastException } from '@/common/exceptions/base.exception';
import { GameConf } from './game.type';
import { AutohostService } from '../autohost/autohost.service';
import { concat, uniqBy } from 'lodash';
import { LoggerProvider } from '@/utils/logger.util';
import { EventEmitter } from 'stream';
import { RoomJoinDto } from '../chat/dtos/room.join.dto';
import { LeaveGameDto } from './dtos/game.leave-game.dto';
import { MidJoinDto } from './dtos/game.mid-join.dto';
import { tokenType } from 'yaml/dist/parse/cst';
import { join, relative } from 'path';
import { KillEngineDto } from './dtos/game.kill-engine.dto';
import { release } from 'os';
import { AutoHostMessage } from '../autohost/dtos/autohost.message.dto';
import { Response } from '@/utils/type.util';
import { send } from 'process';
import { ClientsService } from '../clients/clients.service';
import { DelAiDto } from './dtos/game.del-ai.dto';

type AcquireLockParams = {
  source: string;
  player: string;
  room: string;
};

@Injectable()
export class GameService extends LoggerProvider {
  private roomIdCounter = 0;
  constructor(
    private readonly redisService: RedisService,
    private readonly autohostService: AutohostService,
    private readonly clientService: ClientsService,
  ) {
    super();
  }

  /**
   * Join a game room if it exists, otherwise create a new one.
   */
  async joinGame(dto: JoinGameDto, caller: string): Promise<GameRoom> {
    const { gameName, password, mapId } = dto;
    try {
      const gameRoomLock = await this.redisService.lock(
        `lock:gameRoom:${gameName}`,
      );
      const userLock = await this.redisService.lock(`lock:user:${caller}`);
      if (!gameRoomLock || !userLock) {
        throw new JoinGameExcption(
          'Unexpected error while fetching room info, please try again later.',
        );
      }
      const user = await this.redisService.get<UserState | null | undefined>(
        `userState:${caller}`,
      );
      if (user === null || user === undefined) {
        throw new JoinGameExcption('User not found.');
      }

      let room = await this.redisService.get<GameRoom | null | undefined>(
        `gameRoom:${gameName}`,
      );
      if (room === null || room === undefined) {
        room = new GameRoom({
          title: gameName,
          hoster: caller,
          mapId: parseInt(mapId),
          id: this.roomIdCounter++,
        });

      }
      room.players[caller] = {
        isSpec: false,
        team: 'A',
        hasmap: false,
      };

      await this.redisService.set<GameRoom>(`gameRoom:${gameName}`, room)
      return room;
    } finally {
      await this.redisService.unlock(`lock:gameRoom:${gameName}`);
      await this.redisService.unlock(`lock:user:${caller}`);
    }
  }

  async setTeam(
    dto: SetTeamDto,
    caller: string,
  ): Promise<Pick<GameRoom, 'players'>['players']> {
    const { gameName, team, player: playerName } = dto;

    let releaseLock: () => void | undefined = undefined;
    try {
      const { room, player, release } = await this.acquireLock({
        source: 'SET_TEAM',
        player: playerName,
        room: gameName,
      });
      releaseLock = release;

      if (room.hoster !== caller) {
        throw new GameRoomException(
          'SET_TEAM',
          'Only the hoster can set team.',
        );
      }
      if (!Object.keys(room.players).includes(playerName)) {
        throw new GameRoomException(
          'SET_TEAM',
          'Player is not in the game room.',
        );
      }
      if (room.isStarted) {
        throw new GameRoomException(
          'SET_TEAM',
          'Game has already started, cannot set team.',
        );
      }

      room.players[playerName].team = team;

      releaseLock() // release before syncing

      await this.synchornizeGameRoomWithRedis(room);

      await this.redisService.set(`gameRoom:${gameName}`, room);
      return room.players;
    } finally {
      if (releaseLock) {
        releaseLock();
      }
    }
  }

  async hasMap(dto: SetMapDto, caller: string): Promise<GameRoom> {
    const { gameName, mapId } = dto;

    let releaseLock: () => void | undefined = undefined;
    try {
      const { room, release } = await this.acquireLock({
        source: 'HAS_MAP',
        room: gameName,
      });
      releaseLock = release;

      if (mapId != room.mapId ) {
        throw new GameRoomException('HAS_MAP', 'Room map is not the same with the map you just downloaded')
      }

      room.players[caller].hasmap = true;

      await this.synchornizeGameRoomWithRedis(room);
      await this.redisService.set(`gameRoom:${gameName}`, room);
      return room;
    } finally {
      if (releaseLock) {
        releaseLock();
      }
    }
  }
  

  async setMap(dto: SetMapDto, caller: string): Promise<GameRoom> {
    const { gameName, mapId } = dto;

    let releaseLock: () => void | undefined = undefined;
    try {
      const { room, release } = await this.acquireLock({
        source: 'SET_MAP',
        room: gameName,
      });
      releaseLock = release;

      if (room.hoster !== caller) {
        throw new GameRoomException('SET_MAP', 'Only the hoster can set map.');
      }
      if (room.isStarted) {
        throw new GameRoomException(
          'SET_MAP',
          'Game has already started, cannot set map.',
        );
      }

      room.mapId = mapId;
      await this.synchornizeGameRoomWithRedis(room);
      await this.redisService.set(`gameRoom:${gameName}`, room);
      return room;
    } finally {
      if (releaseLock) {
        releaseLock();
      }
    }
  }

  async setMod(dto: SetModDto, caller: string): Promise<GameRoom> {
    const { gameName, modId } = dto;

    let releaseLock: () => void | undefined = undefined;
    try {
      const { room, release } = await this.acquireLock({
        source: 'SET_MOD',
        room: gameName,
      });
      releaseLock = release;

      if (room.hoster !== caller) {
        throw new GameRoomException('SET_MOD', 'Only the hoster can set mod.');
      }
      if (room.isStarted) {
        throw new GameRoomException(
          'SET_MOD',
          'Game has already started, cannot set mod.',
        );
      }

      room.mod = modId;
      await this.redisService.set(`gameRoom:${gameName}`, room);
      return room;
    } finally {
      if (releaseLock) {
        releaseLock();
      }
    }
  }

  async setAi(dto: SetAiDto, caller: string): Promise<GameRoom> {
    const { gameName, ai, type, team } = dto;
    let releaseFunc = undefined;
    try {
      const { room, release } = await this.acquireLock({
        source: 'SET_AI',
        room: gameName,
      });
      releaseFunc = release;


      if (room.hoster !== caller) {
        throw new GameRoomException('SET_AI', 'Only the hoster can set ai.');
      }
      if (room.isStarted) {
        throw new GameRoomException(
          'SET_AI',
          'Game has already started, cannot set ai.',
        );
      }
      if (type === 'AI') {
        this.logger.debug("setting ai")
        room.ais[ai] = { team };
      } else if (type === 'Chicken') {
        room.chickens[ai] = { team };
      }

      this.logger.debug(JSON.stringify(room))
      await this.redisService.set(`gameRoom:${gameName}`, room);

      this.synchornizeGameRoomWithRedis(room);
      return room;
    } finally {
      if (releaseFunc) {
        releaseFunc();
      }
    }
  }

  async delAI(dto: DelAiDto, caller: string): Promise<GameRoom> {
    const { gameName, ai } = dto;
    let releaseFunc = undefined;
    try {
      const { room, release } = await this.acquireLock({
        source: 'DEL_AI',
        room: gameName,
      });
      releaseFunc = release;


      if (room.hoster !== caller) {
        throw new GameRoomException('DEL_AI', 'Only the hoster can del ai.');
      }
      if (room.isStarted) {
        throw new GameRoomException(
          'DEL_AI',
          'Game has already started, cannot set ai.',
        );
      }

      delete room.ais[ai] 

      this.logger.debug(JSON.stringify(room))
      await this.redisService.set(`gameRoom:${gameName}`, room);

      this.synchornizeGameRoomWithRedis(room);
      return room;
    } finally {
      if (releaseFunc) {
        releaseFunc();
      }
    }
  }

  // todo Update this
  async setSpectator(dto: SetSepctatorDto, caller: string): Promise<GameRoom> {
    const { gameName, player } = dto;
    let releaseFunc = undefined;
    try {
      const { room, release } = await this.acquireLock({
        source: 'SET_SPECTATOR',
        room: gameName,
      });
      releaseFunc = release;

      if (room.hoster !== caller) {
        throw new GameRoomException(
          'SET_SPECTATOR',
          'Only the hoster can set spectator.',
        );
      }

      if (!Object.keys(room.players).includes(player)) {
        throw new GameRoomException(
          'SET_SPECTATOR',
          'Player is not in the game room.',
        );
      }

      room.players[player].isSpec = true;

      this.synchornizeGameRoomWithRedis(room);
      return room;
    } finally {
      if (releaseFunc) {
        releaseFunc();
      }
    }
  }

  async leaveGame(dto: LeaveGameDto, caller: string): Promise<{
    user: UserState,
    room: GameRoom
  }> {
    const {gameName} = dto;
    let releaseFunc = undefined;
    try {
      const {player, room, release} = await this.acquireLock({
        source: 'LEAVE_GAME',
        room: gameName,
        player: caller
      })
      releaseFunc = release;

      if(!Object.keys(room.players).includes(caller)) {
        throw new GameRoomException(
          'LEAVE_GAME',
          'Player not is not in the game room.'
        )
      }

      delete room.players[caller];
      player.game = null;

      await this.redisService.set<UserState>(`userState:${caller}`, player)
      await this.synchornizeGameRoomWithRedis(room);
      return {
        room,
        user: player
      };
    } finally {
      if(releaseFunc) {
        releaseFunc()
      }
    }
  }

  async startGame(dto: StartGameDto, caller: string): Promise<GameRoom> {
    const { gameName } = dto;
    let releaseFunc = undefined;
    try {
      const { room, release } = await this.acquireLock({
        source: 'START_GAME',
        room: gameName,
      });
      releaseFunc = release;
      if (!room) {
        throw new GameRoomException(
          'STARTGAME',
          'Game room does not exist, cannot start.',
        );
      }
      if (room.hoster !== caller) {
        throw new GameRoomException(
          'STARTGAME',
          'Only the hoster can start the game.',
        );
      }
      if (room.isStarted) {
        throw new GameRoomException(
          'STARTGAME',
          'Game already started',
        );
      }

      for (const player of Object.values(room.players)) {
        if (!player.hasmap) {
          throw new BroadcastException(
            'STARTGAME',
            'Some players have not set their map, cannot start.',
            Object.keys(room.players),
          );
        }
      }

      // setup payload to Autohost
      const engineConf: GameConf = {
        id: room.id,
        roomId: room.id,
        mgr: this.autohostService.getFreeAutohost(),
        title: room.title,
        mapId: room.mapId,
        aiHosters: [0],
        team: {},
        mod: room.mod
      };

      let index = 0;
      let teams = []
      for(const pname in room.players) {
          teams.push(room.players[pname].team) 
      }
      for (const pname in room.ais) {
        teams.push(room.ais[pname].team)
      }

      teams = teams.filter((x, i) => i === teams.indexOf(x))
      let teamsMapping = {}
      for(let i=0; i<teams.length; i++) {
        teamsMapping[teams[i]] = i;
      }
      
      for(const pname in room.players) {
        let player = room.players[pname]
        engineConf.team[pname] = {
          index: index,
          isAI: false,
          isChicken: false,
          isSpectator: player.isSpec, 
          team: teamsMapping[player.team]
        }
        index++;
      }

      for(const pname in room.ais) {
        let player = room.ais[pname]
        engineConf.team[pname] = {
          index: index,
          isAI: true,
          isChicken: false,
          isSpectator: false, 
          team: teamsMapping[player.team]
        }
        index++;
      }

      this.logger.debug(`engineConf: ${JSON.stringify(engineConf)}`)

      let [autohostIP, cli] = this.autohostService.startGame(engineConf);
      if(autohostIP.includes("127.0.0.1")) {
        autohostIP = '127.0.0.1'
      } 
      cli.ws.on('message', async (data, _) => {
        let msg: {
          action: string
          parameters: {[key:string]: any}
        } = JSON.parse(data.toString())
        switch(msg.action) {
          case 'serverEnding': {
            let releaseFunc = undefined;
            try {
              const { room, release } = await this.acquireLock({
                source: 'GAMEENDED',
                room: gameName,
              });
              room.isStarted = false;
              await this.synchornizeGameRoomWithRedis(room);
              const serverEndedMsg: Response<GameRoom> = {
                status: 'success',
                action: 'GAMEENDED',
                path: `user.game`,
                state: room,
                seq: -1,
              }
              releaseFunc = release;
              this.clientService.broadcast(Object.keys(room.players), serverEndedMsg)
            } catch(e) {
              this.logger.debug(`unable to send gameend: ${e}`)
            } finally {
              if(releaseFunc) releaseFunc()
            }
          }
        }
      })
      room.responsibleAutohost = autohostIP;
      let res: boolean = await new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new GameRoomException('STARTGAME', 'timeout listening response from autohost'))
        }, 30000)
        cli.ws.on('message', (data, _) => {
          let msg: {
            action: string
            parameters: {[key:string]: any}
          } = JSON.parse(data.toString())
          if(msg.action === 'serverStarted') {
            room.isStarted = true;
            room.autohostPort = parseInt(msg.parameters['port'])
            this.logger.debug(`updated room: ${JSON.stringify(room)}`)

            resolve(true);
          } else {
            // TODO: handle other, add a time out as well
          }
        })
      })
      this.logger.debug('synncrhonizing redis')
      if(res) {
        this.logger.debug('marking room isStarted')
        room.isStarted = true;
      }
      await this.synchornizeGameRoomWithRedis(room);

      return room;
    } finally {
      if (releaseFunc) {
        releaseFunc();
      }
    }
  }

  async killEngine(dto: KillEngineDto, caller: string): Promise<GameRoom> {
    let releaseFunc = undefined;
    const {gameName} = dto;
    try {
      const { room, release } = await this.acquireLock({
        source: 'KILLENGINE',
        room: gameName,
      });
      releaseFunc = release;
      if (!room) {
        throw new GameRoomException(
          'KILLENGINE',
          'Game room does not exist, cannot start.',
        );
      }
      if (room.hoster !== caller) {
        throw new GameRoomException(
          'KILLENGINE',
          'Only the hoster can start the game.',
        );
      }

      const killEngineMsg: AutoHostMessage = {
        action: 'killEngine',
        parameters: {
          id: room.id,
          title: room.title
        }
      }
      const [_, cli] = this.autohostService.killGame(killEngineMsg);
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new GameRoomException('KILLENGINE', 'timeout listening response from autohost'))
        }, 5000)
        cli.ws.on('message', (data, _) => {
          let msg: {
            action: string
            parameters: {[key:string]: any}
          } = JSON.parse(data.toString())
          if(msg.action === 'killEngineRejected') {
            reject(new GameRoomException('KILLENGINE', 'kill engine command rejected'))
          } else if(msg.action === 'killEngineSignalSent'){
            room.isStarted = false;
            resolve(true);
          }
        })
      })

      await this.synchornizeGameRoomWithRedis(room);

      return room;
    } finally {
      if(releaseFunc) releaseFunc()
    }
  }

  async midJoin(dto: MidJoinDto, caller: string): Promise<GameRoom> {
    let releaseFunc = undefined;
    const {gameName} = dto;
    try {
      const {room, release} = await this.acquireLock({
        source: 'MIDJOIN',
        room: gameName
      });
      releaseFunc = release
      // release it immediately since we don't change any of the room state
      release()

      if(!Object.keys(room.players).includes(caller)) {
        throw new GameRoomException('LEAVEGAME', 'not a player in this game room');
      }

      const [_, cli, success] = this.autohostService.midjoin({
        action: 'midJoin',
        parameters: {
          id: room.id,
          title: room.title,
          team: room.players[caller].team,
          token: room.engineToken,
          isSpec: room.players[caller].isSpec,
          playerName: caller,
        }
      })

      this.logger.debug(`success(${success})`)
      if(success) {
        const joined: boolean = await new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new GameRoomException('MIDJOIN', 'timeout waiting autohost response'))
          }, 2000)
          cli.ws.on('message', (data, _) => {
            let msg: {
              action: string,
              parameters: {[key: string]: any}
            } = JSON.parse(data.toString())

            this.logger.debug(`receiving msg from autohost: ${msg}`)

            if(msg.action == 'midJoined') {
              resolve(true)
            } else if(msg.action == 'joinRejected') {
              resolve(false)
            }
          })
        })

        if(joined) {
          return room;
        } else {
          throw new GameRoomException('MIDJOIN', 'Could not mid join')
        }
      }
    } finally {
      if(releaseFunc) releaseFunc()
    }
  } 

  private createGameConf(room: GameRoom): GameConf {
    const engineConf: GameConf = {
      id: room.id,
      roomId: room.id,
      mgr: this.autohostService.getFreeAutohost(),
      title: room.title,
      mapId: room.mapId,
      aiHosters: [],
      team: {},
      mod: 'mod.sdd'
    };
    // teamMapping tracks each Team to a number as id

    const keyPairs = uniqBy(
      concat(
        Object.values(room.players),
        Object.values(room.ais),
        Object.values(room.chickens),
      ),
      'team',
    ).map((player, i) => [player.team, i]);
    const teamMapping = Object.fromEntries(keyPairs);
    let index = 0;
    for (const [name, player] of Object.entries(room.players)) {
      const team = player.isSpec ? 0 : teamMapping[player.team];
      engineConf.team[name] = {
        index,
        isAI: false,
        isChicken: false,
        isSpectator: player.isSpec,
        team,
      };
      if (name in room.aiHosters) {
        engineConf.aiHosters.push(index);
      }
      index++;
    }

    for (const [name, ai] of Object.entries(room.ais)) {
      const id = `${name}${index}`;
      engineConf.team[id] = {
        index,
        isAI: true,
        isChicken: false,
        isSpectator: false,
        team: teamMapping[ai.team],
      };
      index++;
    }

    for (const [name, chicken] of Object.entries(room.chickens)) {
      const id = `${name}${index}`;
      engineConf.team[id] = {
        index,
        isAI: false,
        isChicken: true,
        isSpectator: false,
        team: teamMapping[chicken.team],
      };
      index++;
    }
    return engineConf;
  }

  private async synchornizeGameRoomWithRedis(
    gameRoom: GameRoom,
  ): Promise<void> {
    // release inactive game room, assumed lock of gameroom is acquired before this
    if (Object.keys(gameRoom.players).length == 0) {
      this.logger.debug(`removing game ${gameRoom.title}`)
      
      await this.redisService.remove(`gameRoom:${gameRoom.title}`)
      return;
    }

    const lockGuards = await Promise.all(
      Object.keys(gameRoom.players).map((player) =>
        this.acquireLock({
          source: 'SYNC_ROOM_STATE',
          player,
        }),
      ),
    );
    lockGuards.forEach((guard) => {
      const player = guard.player;
      player.game = gameRoom;
    });
    await Promise.all(
      lockGuards.map((guard) => {
        this.redisService.set(`userState:${guard.player}`, guard.player);
        guard.release();
      }),
    );
  }

  private async acquireLock(
    param: Omit<AcquireLockParams, 'player'>,
  ): Promise<{ room: GameRoom; release: () => void }>;
  private async acquireLock(
    param: Omit<AcquireLockParams, 'room'>,
  ): Promise<{ player: UserState; release: () => void }>;
  private async acquireLock(
    param: AcquireLockParams,
  ): Promise<{ player: UserState; room: GameRoom; release: () => void }>;
  private async acquireLock(
    param: AcquireLockParams,
  ): Promise<{ player: UserState; room: GameRoom; release: () => void }> {
    const res = {
      player: undefined,
      room: undefined,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      release: () => {},
    };
    if (param.player) {
      this.logger.debug(`locking lock:user:${param.player} source: ${param.source}`)
      const playerLock = await this.redisService.lock(
        `lock:user:${param.player}`,
      );
      if (!playerLock) {
        throw new GameRoomException(
          param.source,
          'Unable to acquire player info, please try again later',
        );
      }
      const player = await this.redisService.get<UserState>(
        `userState:${param.player}`,
      );
      if (!player) {
        throw new GameRoomException(param.source, 'Player not found');
      }
      res.player = player;
    }
    if (param.room) {
      this.logger.debug(`locking lock:gameRoom:${param.room} source: ${param.source}`)
      const roomLock = await this.redisService.lock(
        `lock:gameRoom:${param.room}`,
      );
      if (!roomLock) {
        throw new GameRoomException(
          param.source,
          'Unable to acquire room info, please try again later',
        );
      }
      const room = await this.redisService.get<GameRoom>(
        `gameRoom:${param.room}`,
      );
      this.logger.debug(`fetched room: ${room}`)
      if (!room) {
        throw new GameRoomException(param.source, 'Room not found');
      }
      res.room = room;
    }

    res.release = async () => {
      if (param.player) {
        this.logger.debug(`unlocking lock:user:${param.player} source: ${param.source}`)
        await this.redisService.unlock(`lock:user:${param.player}`);
      }
      if (param.room) {
        this.logger.debug(`unlocking lock:gameRoom:${param.room} source: ${param.source}`)
        await this.redisService.unlock(`lock:gameRoom:${param.room}`);
      }
    };
    return res;
  }
}
