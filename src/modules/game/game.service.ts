import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JoinGameDto } from './dtos/game.join.dto';
import { GameRoom } from './dtos/game.game-room.dto';
import { JoinGameExcption } from '@/common/exceptions/game.exception';
import { User } from '../user/user.entity';
import { UserState } from '../redis/dtos/redis.user.dto';
import { v4 as uuid } from 'uuid';
@Injectable()
export class GameService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Join a game room if it exists, otherwise create a new one.
   */
  async joinGame(dto: JoinGameDto, caller: string): Promise<GameRoom> {
    const { gameName, password, mapId } = dto;
    try {
      const gameRoomLock = this.redisService.lock(`lock:gameRoom:${gameName}`);
      const userLock = this.redisService.lock(`lock:userState:${caller}`);
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
          mapId: parseInt(mapId, 10),
          password: password,
          id: uuid(),
        });
        this.redisService.set(`gameRoom:${room.title}`, room);
      }
      if (room.password !== password) {
        throw new JoinGameExcption('Wrong password.');
      }
      room.players[caller] = {
        isSepctator: false,
        team: 'A',
        hasmap: false,
      };

      user.game = room;
      this.redisService.set(caller, user);
      return room;
    } finally {
      this.redisService.unlock(`lock:gameRoom:${gameName}`);
      this.redisService.unlock(`lock:userState:${caller}`);
    }
  }
}
