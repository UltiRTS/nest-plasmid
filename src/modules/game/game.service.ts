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

type AcquireLockParams = {
  source: string;
  player: string;
  room: string;
};

@Injectable()
export class GameService {
  private roomIdCounter = 0;
  constructor(
    private readonly redisService: RedisService,
    private readonly autohostService: AutohostService,
  ) {}

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
      } else {
        room.players[caller] = {
          isSepctator: false,
          team: 'A',
          hasmap: false,
        };
      }
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

      await this.synchornizeGameRoomWithRedis(room);

      await this.redisService.set(`gameRoom:${gameName}`, room);
      return room.players;
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

      room.mapId = parseInt(mapId);
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
      if (type === 'ai') {
        room.ais[ai] = { team };
      } else if (type === 'chicken') {
        room.chickens[ai] = { team };
      }

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

      room.players[player].isSepctator = true;

      this.synchornizeGameRoomWithRedis(room);
      return room;
    } finally {
      if (releaseFunc) {
        releaseFunc();
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
          'Game has already started, cannot start again.',
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
        id: uuidv4(),
        roomId: room.id,
        mgr: this.autohostService.getFreeAutohost(),
        title: room.title,
        mapId: room.mapId,
        aiHosters: [],
        team: {},
      };

      this.autohostService.startGame(engineConf);

      room.isStarted = true;

      this.synchornizeGameRoomWithRedis(room);
      return room;
    } finally {
      if (releaseFunc) {
        releaseFunc();
      }
    }
  }

  private createGameConf(room: GameRoom): GameConf {
    const engineConf: GameConf = {
      id: room.id,
      mgr: this.autohostService.getFreeAutohost(),
      title: room.title,
      mapId: room.mapId,
      aiHosters: [],
      team: {},
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
      const team = player.isSepctator ? 0 : teamMapping[player.team];
      engineConf.team[name] = {
        index,
        isAI: false,
        isChicken: false,
        isSpectator: player.isSepctator,
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
      if (!room) {
        throw new GameRoomException(param.source, 'Room not found');
      }
      res.room = room;
    }

    res.release = async () => {
      if (param.player) {
        await this.redisService.unlock(`lock:user:${param.player}`);
      }
      if (param.room) {
        await this.redisService.unlock(`lock:gameRoom:${param.room}`);
      }
    };
    return res;
  }
}
