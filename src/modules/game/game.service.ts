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
      const gameRoomLock = await this.redisService.lock(
        `lock:gameRoom:${gameName}`,
      );
      const userLock = await this.redisService.lock(`lock:user:${caller}`);
      if (!gameRoomLock || !userLock) {
        throw new JoinGameExcption(
          'Unexpected error while fetching room info, please try again later.',
        );
      }
      const user = await this.redisService.get<User | null | undefined>(caller);
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
        });
      }
      return room;
    } finally {
      await this.redisService.unlock(`lock:gameRoom:${gameName}`);
      await this.redisService.unlock(`lock:user:${caller}`);
    }
  }
}
