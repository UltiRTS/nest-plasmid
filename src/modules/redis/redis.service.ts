import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { REDIS_CLIENT, RedisClient } from './redis.factory';
import { State, UserDump } from '@/utils/statedict';
import { UserState } from './dtos/redis.user.dto';
import { ChatRoom } from '../chat/chat.entity';
import { ChatRoomState } from '@/utils/statedict';
import { GameRoom } from '../game/dtos/game.game-room.dto';
export type RedisSetOptions = {
  expire?: number;
  keepExpireTime?: boolean;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  public constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  public async get<T = any>(key: string): Promise<T> {
    return JSON.parse(await this.redis.get(key));
  }

  public async set<T = any>(
    key: string,
    value: T,
    options?: RedisSetOptions,
  ): Promise<void> {
    const _options: ({ NX: true } | {}) & { EX?: number } = Object.assign(
      options?.keepExpireTime ? { NX: true } : {},
      {
        EX: options?.expire,
      },
    );
    await this.redis.set(key, JSON.stringify(value), _options);
  }

  public async has(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  public async remove(key: string): Promise<void> {
    await this.redis.del(key);
  }

  public async lock(key: string): Promise<boolean> {
    return (
      (await this.redis.set(key, JSON.stringify(true), { NX: true })) === 'OK'
    );
  }

  /**
   * Dump the state of a user, including the global
   * chatrooms and games.
   * @param username the username of the user
   * @returns {Promise<State>} the state of the current user
   */
  public async dump(username: string): Promise<State> {
    const user: UserState = await this.get(`userState:${username}`);
    const game = user.game ? await this.get(`game:${user.game}`) : null;
    // const adventure = user.adventure
    //   ? await this.get(`adventure:${user.adventure}`)
    //   : null;

    // check friends online
    // 1. filter all the friends that are online
    // 2. extract usernames
    const friendsOnline = await Promise.all(
      user.friends.filter(async (f) => {
        const friend = await this.get(`userState:${f}`);
        return !!friend;
      }),
    ).then((r) => r.map((f) => f.username));

    // get chatrooms
    let chatRooms = await Promise.all(
      user.chatRooms.map(async (r) => {
        const room = await this.get(`chatRoom:${r}`);
        return {
          [r]: {
            roomName: room.roomName,
            createAt: room.createAt,
            password: room.password,
            members: room.members,
            lastMessage: {
              author: room.lastMessage.author,
              content: room.lastMessage.content,
              time: room.lastMessage.time,
            },
          },
        };
      }),
    ).then((r) => r.reduce((prev, curr) => ({ ...prev, ...curr }), {}));

    const userState = user.asDump();
    const userDump: UserDump = {
      ...userState,
      game,
      username: user.username,
      friends: user.friends.map((f) => f.username),
      friendsOnline,
      sanity: 42, // TODO: add logic for sanity
      chatRooms,
    };

    // get global chatrooms
    const rooms = await this.redis.keys('room:*').then((r) => r.slice(5));

    // get global games
    const gameRoomIds = await this.redis.keys('gameRoom:*');
    const games = await Promise.all(
      gameRoomIds.map((id) => this.get<GameRoom>(id)),
    ).then((rooms) =>
      rooms.map((r) => ({
        title: r.title,
        hoster: r.hoster,
        mapId: r.mapId,
      })),
    );

    return {
      user: userDump,
      chats: rooms,
      games,
    };
  }

  public async unlock(key: string): Promise<void> {
    await this.redis.del(key);
  }

  onModuleDestroy() {
    this.redis.quit();
  }
}
