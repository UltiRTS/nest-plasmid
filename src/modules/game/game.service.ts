import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JoinGameDto } from './dtos/game.join.dto';
import { GameRoom } from './dtos/game.game-room.dto';
import { JoinGameExcption } from '@/common/exceptions/game.exception';
import { User } from '../user/user.entity';

@Injectable()
class GameService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Join a game room if it exists, otherwise create a new one.
   */
  async joinGame(dto: JoinGameDto): Promise<GameRoom> {
    const { gameName, password, caller, mapId } = dto;

    const gameRoomLock = this.redisService.lock(`lock:gameRoom:${gameName}`);
    const userLock = this.redisService.lock(`lock:user:${caller}`);
    if (!gameRoomLock || !userLock) {
      throw new JoinGameExcption(
        'Unexpected error while fetching room info, please try again later.',
      );
    }
    let user = await this.redisService.get<User | null | undefined>(caller);
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
        mapId: mapId,
      });
    }

    return room;
  }
}
