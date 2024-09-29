import { Injectable } from '@nestjs/common';
import { UserState } from '../redis/dtos/redis.user.dto';
import { PingResponse } from './ping.entity';
import { LoggerProvider } from '@/utils/logger.util';
import { RedisService } from '../redis/redis.service';
import { GameService } from '../game/game.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class PingService extends LoggerProvider {
  // user name to unix timestamp 
  private lastResponse: Map<string, number>;

  constructor(
    private readonly redisService: RedisService,
    private readonly gameService: GameService,
    private readonly chatService: ChatService,
  ) {
    super();

    this.lastResponse = new Map();
  }

  async ping(username: string): Promise<PingResponse> {
    let now = Date.now()
    if(this.lastResponse.get(username) === undefined) {
      this.lastResponse.set(username, now)
      this.logger.debug(`updating ${username} to ${now}`)
      let intervalHandler = setInterval(async () => {
        let now = Date.now();
        let timePrevPing = this.lastResponse.get(username);
        // 10s not responding <=> 3pings
        if ( now - timePrevPing > 10000) {
          this.lastResponse.delete(username);
          clearInterval(intervalHandler);
          await this.clearUser(username)
          this.logger.debug(`clearing user ${username}, now: ${now}, prev: ${timePrevPing}`)
        }
      }, 1000);
    } else {
      this.logger.debug(`updating ${username} to ${now}`)
      this.lastResponse.set(username, now)
    }


    return {
      action: 'PONG',
      parameters: {},
    };
  }

  async clearUser(username: string) {
      const user = await this.redisService.get<UserState | null | undefined>(
        `userState:${username}`,
      );
      if (user === null || user === undefined) {
        this.logger.error("no such user found in redis")
        return
      }
      this.logger.debug(user)
      if(user.game) {
        this.logger.debug(`removing game as logout: ${user.game.title}`) 
        try {
          await this.gameService.leaveGame({
            gameName: user.game.title
          }, username)
        } catch(e) {
          this.logger.error(`unable to leave game: ${e}`)
        }
      }
      for(const chat of user.chatRooms) {
        try {
          await this.chatService.leaveRoom({
            username,
            chatName: chat,
          })
        } catch(e) {
          this.logger.error(`unable to leave chatroom: ${e}`)
        }
      }
  }
}
