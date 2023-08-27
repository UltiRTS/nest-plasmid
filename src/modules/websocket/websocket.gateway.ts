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

import { ChatService } from '@/modules/chat/chat.service';
import { ChatRoom, Chat } from '@/modules/chat/chat.entity';
import { RoomJoinDto } from '@/modules/chat/dtos/room.join.dto';
import { RoomLeaveDto } from '@/modules/chat/dtos/room.leave.dto';
import { RoomSayDto } from '@/modules/chat/dtos/room.say.dto';
import { PingResponse } from '../ping/ping.entity';
import { PingService } from '../ping/ping.service';
import { DumpState } from '@/common/decorators/dump-state.decorater';

type WebSocketClient = WebSocket & { id: string; userId?: number };

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
  ) {
    super();
  }

  @WebSocketServer()
  server: Server<WebSocketClient>;

  @DumpState((user: User) => user.username)
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
  ): Promise<User> {
    this.logger.debug('register: ', data);
    return await this.userService.register(data);
  }
  @DumpState((user: User) => user.username)
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('LOGIN')
  async userLogin(
    @MessageBody() data: UserLoginDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<User> {
    this.logger.debug('login: ', data);
    const user = await this.userService.login({ ...data, clientId: client.id });
    client.userId = user.id;
    return user;
  }

  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('JOINCHAT')
  async joinChat(
    @MessageBody() data: RoomJoinDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<ChatRoom> {
    this.logger.debug('join chat: ', data);
    return await this.chatService.joinRoom({ ...data, userId: client.userId });
  }

  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('LEAVECHAT')
  async leaveChat(
    @MessageBody() data: RoomLeaveDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<{}> {
    this.logger.debug('leave chat: ', data);
    return await this.chatService.leaveRoom({ ...data, userId: client.userId });
  }

  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('SAYCHAT')
  async sayChat(
    @MessageBody() data: RoomSayDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<Chat> {
    this.logger.debug('say chat: ', data);
    const chat = await this.chatService.sayRoom({
      ...data,
      userId: client.userId,
    });
    // notify all user in chat room
    const { users } = await this.redisService.get(`room:${chat.room.id}`);
    this.server.clients.forEach((_client) => {
      if (_client.userId && users.includes(_client.userId)) {
        // skip self
        if (_client.id === client.id) return;
        if (_client.readyState === OPEN) {
          // TODO: structure chat message
          _client.send(JSON.stringify(instanceToPlain(chat)));
        }
      }
    });
    return chat;
  }

  @SubscribeMessage('PING')
  async ping(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<PingResponse> {
    this.logger.debug('ping: ', data);
    return this.pingService.ping();
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
  }
}
