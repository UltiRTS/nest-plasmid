import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { REDIS_CLIENT, RedisClient } from './redis.factory';
import { GameBrief, State, UserDump } from '@/utils/statedict';
import { UserState } from './dtos/redis.user.dto';
import { ChatRoom } from '../chat/chat.entity';
import { ChatRoomState } from '@/utils/statedict';
import { GameRoom } from '../game/dtos/game.game-room.dto';
import _, { last } from 'lodash';
export type RedisSetOptions = {
  expire?: number;
  keepExpireTime?: boolean;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  public constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {
    // if (process.env.NODE_ENV === 'development') {
    //   this.redis.flushAll();
    // }
  }

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
    const plainUserState = await this.get(`userState:${username}`);
    const user = plainUserState ? UserState.fromRedis(plainUserState) : null;
    if (!user) {
      return {
        chats: [],
        games: [],
        user: {
          blocked: false,
          chatRooms: {},
          confirmations: [],
          exp: 0,
          friends: [],
          game: null,
          sanity: 42,
          username: username,
          friendsOnline: [],
          friendsMarked: [],
        },
      };
    }
    const game = user.game ? await this.get(`game:${user.game}`) : null;
    // const adventure = user.adventure
    //   ? await this.get(`adventure:${user.adventure}`)
    //   : null;

    // check friends online
    // 1. filter all the friends that are online
    // 2. extract usernames

    const friendsOnline = await Promise.all(
      user.friends.map((friend) => this.get<UserState>(`userState:${friend}`)),
    )
      .then((states) =>
        states.filter((state) => state !== null && state !== undefined),
      )
      .then((states) => states.map((state) => state.username));

    // get chatrooms
    // const chatRoomsArr = await Promise.all(
    //   user.chatRooms.map(async (r) => {
    //     const room = await this.get(`room:${r}`);
    //     return {
    //       roomName: room.roomName,
    //       createAt: room.createAt,
    //       password: room.password,
    //       members: room.members,
    //       lastMessage: room.lastMessage
    //         ? {
    //             author: room.lastMessage.author,
    //             content: room.lastMessage.content,
    //             time: room.lastMessage.time,
    //           }
    //         : null,
    //     };
    //   }),
    // );
    const chatRoomsArr = await Promise.all(
      user.chatRooms.map((r) => this.get<ChatRoomState>(`room:${r}`)),
    )
      .then((rooms) => rooms.filter((room) => !!room))
      .then((rooms) =>
        rooms.map((room) => ({
          roomName: room.roomName,
          createAt: room.createAt,
          password: room.password,
          members: room.members,
          lastMessage: room.lastMessage
            ? {
                author: room.lastMessage.author,
                content: room.lastMessage.content,
                time: room.lastMessage.time,
              }
            : null,
        })),
      );
    const chatRooms: { [key: string]: ChatRoomState } = chatRoomsArr.reduce(
      (acc, cur) => ({ ...acc, [cur.roomName]: cur }),
      {},
    );
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

  public async getAllOnlineUsers(): Promise<string[]> {
    return (await this.redis.keys('userState:*')).map(k => k.split(':')[1])
  }

  public async getAllGameRooms(): Promise<GameBrief[]> {
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

    return games;
  }

  public async unlock(key: string): Promise<void> {
    await this.redis.del(key);
  }

  onModuleDestroy() {
    this.redis.quit();
  }
}
