import 'reflect-metadata';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Server, WebSocket, OPEN } from 'ws';
import { v4 as uuidV4 } from 'uuid';
import { instanceToPlain } from 'class-transformer';

import { ValidationPipe } from '@/common/pipes/validation.pipe';
import { AllExceptionsFilter } from '@/common/filters/all.filter';
import { BaseExceptionsFilter } from '@/common/filters/exception.filter';
import { AuthGuard } from '@/common/guards/auth.guard';
import { LoggerProvider } from '@/utils/logger.util';
import { RedisService } from '@/modules/redis/redis.service';

import { UserRegisterDto } from '@/modules/user/dtos/user.register.dto';
import { UserLoginDto } from '@/modules/user/dtos/user.login.dto';
import { User } from '@/modules/user/user.entity';
import { UserService } from '@/modules/user/user.service';
import { GameService } from '@/modules/game/game.service';
import { ChatService } from '@/modules/chat/chat.service';
import { ChatRoom, Chat } from '@/modules/chat/chat.entity';
import { RoomJoinDto } from '@/modules/chat/dtos/room.join.dto';
import { RoomLeaveDto } from '@/modules/chat/dtos/room.leave.dto';
import { RoomSayDto } from '@/modules/chat/dtos/room.say.dto';
import { PingResponse } from '../ping/ping.entity';
import { PingService } from '../ping/ping.service';
import { StatePath } from '@/common/decorators/dump-state.decorater';
import { ChatRoomState, State } from '@/utils/statedict';
import { UserState } from '../redis/dtos/redis.user.dto';
import { PartialDeep } from 'type-fest';
import { DeepPartial } from 'typeorm';
import { Response } from '@/utils/type.util';
import { stat } from 'fs';
import { JoinGameDto } from '../game/dtos/game.join.dto';
import { GameRoom, GameRoomPlayer } from '../game/dtos/game.game-room.dto';
type WebSocketClient = WebSocket & {
  id: string;
  userId?: number;
  username?: string;
};

// TODO: remove cors on production
// You can test this in https://www.piesocket.com/socketio-tester
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway extends LoggerProvider {
  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly chatService: ChatService,
    private readonly pingService: PingService,
    private readonly gameService: GameService,
  ) {
    super();
  }

  @WebSocketServer()
  server: Server<WebSocketClient>;
  clientsByUsername: { [id: string]: WebSocketClient } = {};
  // transform the result to statedump format
  // handle exceptions, you can throw any exceptions inherited from `BaseException`(import from `@/common/exception/base.exception`) in event
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  // Validation for typed data.
  // If you want to validate data, follow steps below:
  //   1. import `ValidationPipe` from `@/common/pipes/validation`
  //   2. add `@UsePipes(new ValidationPipe())` decorator on method
  //   3. add `@MessageBody() data: YourDto` decorator on method parameter
  //   4. add decorator imported from `class-validator` like `@IsString({ message: 'xxx must be string' })` on dto property
  @UsePipes(new ValidationPipe())
  // `action` field from websocket message
  @SubscribeMessage('REGISTER')
  // method name has no limit
  async userRegister(
    @MessageBody() data: UserRegisterDto,
    // you can close connection by `client.close()` or do something else
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<State> {
    this.logger.debug('register: ', data);
    const user = await this.userService.register(data);
    return await this.redisService.dump(user.username);
  }

  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('LOGIN')
  async userLogin(
    @MessageBody() data: UserLoginDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<State> {
    this.logger.debug('login: ', data);
    const user = await this.userService.login({ ...data, clientId: client.id });
    client.userId = user.id;
    client.username = user.username;
    this.clientsByUsername[user.username] = client;
    return await this.redisService.dump(user.username);
  }

  @StatePath((room: ChatRoomState) => `user.chatRooms.${room.roomName}`)
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('JOINCHAT')
  async joinChat(
    @MessageBody() data: RoomJoinDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<ChatRoomState> {
    this.logger.debug('join chat: ', data);
    const chatRoom = await this.chatService.joinRoom({
      ...data,
      username: client.username,
    });

    const msg: Response<string[]> = {
      status: 'success',
      action: 'JOINCHAT',
      state: chatRoom.members,
      path: `user.chatRooms.${chatRoom.roomName}.members`,
      seq: -1,
    };
    const otherMembers = chatRoom.members.filter(
      (username) => username !== client.username,
    );
    this.broadcastMessage(msg, otherMembers);
    return chatRoom;
  }

  @StatePath('user.chatRooms')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('LEAVECHAT')
  async leaveChat(
    @MessageBody() data: RoomLeaveDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<{}> {
    this.logger.debug('leave chat: ', data);
    const rooms = await this.chatService.leaveRoom({
      ...data,
      username: client.username,
    });
    const chatRoom = await this.redisService.get<ChatRoomState>(
      `room:${data.chatName}`,
    );
    const msg: Response<string[]> = {
      status: 'success',
      action: 'LEAVECHAT',
      state: chatRoom.members,
      path: `user.chatRooms.${chatRoom.roomName}.members`,
      seq: -1,
    };
    this.broadcastMessage(msg, chatRoom.members);
    return rooms;
  }

  @StatePath((chat: ChatRoom) => `user.chatRooms.${chat.roomName}`)
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('SAYCHAT')
  async sayChat(
    @MessageBody() data: RoomSayDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<ChatRoomState> {
    this.logger.debug('say chat: ', data);
    const chatRoom = await this.chatService.sayRoom({
      ...data,
      username: client.username,
    });
    // notify all user in chat room

    const msg: Response<ChatRoomState> = {
      status: 'success',
      action: 'SAYCHAT',
      path: `user.chatRooms.${chatRoom.roomName}`,
      state: chatRoom,
      seq: -1,
    };
    const otherMembers = chatRoom.members.filter(
      (username) => username !== client.username,
    );
    this.broadcastMessage(msg, otherMembers);
    return chatRoom;
  }

  private broadcastMessage<T>(message: Response<T>, recipeints: string[]) {
    recipeints.forEach((username) => {
      const client = this.clientsByUsername[username];
      if (client && client.readyState === OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  @SubscribeMessage('PING')
  async ping(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<PingResponse> {
    this.logger.debug('ping: ', data);
    return this.pingService.ping();
  }

  @StatePath('user.game')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('JOINGAME')
  async joinGame(
    @MessageBody() joinGameDto: JoinGameDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom> {
    this.logger.debug('join game: ', { data: joinGameDto, client });
    const username = client.username;
    const room = await this.gameService.joinGame(joinGameDto, username);
    const message: Response<GameRoomPlayer> = {
      status: 'success',
      action: 'JOINGAME',
      path: `user.game.players.${client.username}`,
      state: room.players[client.username],
      seq: -1,
    };
    this.broadcastMessage(
      message,
      Object.keys(room.players).filter(
        (username) => username !== client.username,
      ),
    );
    return room;
  }

  // lifecycle reference: https://docs.nestjs.com/websockets/gateways#lifecycle-events
  afterInit() {
    this.logger.log('Websocket Server Initialized');
  }

  handleConnection(client: WebSocketClient) {
    client.id = uuidV4();
    // client.send(
    //   JSON.stringify({ status: 'success', action: 'AUTHENTICATE_REQUIRED' }),
    // );
    // keep client alive for 1 hour
    this.redisService.set(`client:${client.id}`, {}, { expire: 60 * 60 * 1 });
  }

  handleDisconnect(client: WebSocketClient) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.redisService.remove(`user:${client.userId}`);
    this.redisService.remove(`client:${client.id}`);
    if (this.clientsByUsername[client.username]) {
      delete this.clientsByUsername[client.username];
    }
  }
}
