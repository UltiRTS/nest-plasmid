import 'reflect-metadata';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseFilters, UsePipes } from '@nestjs/common';
import { Server } from 'ws';
import { v4 as uuidV4 } from 'uuid';

import { ValidationPipe } from '@/common/pipes/validation.pipe';
import { WebsocketExceptionsFilter } from '@/common/filters/websocket.filter';
import { LoggerProvider } from '@/utils/logger.util';
import { RedisService } from '@/modules/redis/redis.service';

import { UserRegisterDto } from '@/modules/user/dtos/user.register.dto';
import { UserLoginDto } from '@/modules/user/dtos/user.login.dto';
import { User } from '@/modules/user/user.entity';
import { UserService } from '@/modules/user/user.service';

type WebSocketClient = WebSocket & { id: string };

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
  ) {
    super();
  }

  @WebSocketServer()
  server: Server;

  // handle websocket exceptions, you can throw `WsException`(import from `@nestjs/websocket`) in controller
  @UseFilters(new WebsocketExceptionsFilter())
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
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<User> {
    this.logger.debug('register: ', data);
    return await this.userService.register(data);
  }

  @UseFilters(new WebsocketExceptionsFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('LOGIN')
  async userLogin(
    @MessageBody() data: UserLoginDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<User> {
    this.logger.debug('login: ', data);
    return await this.userService.login(data);
  }

  // lifecycle reference: https://docs.nestjs.com/websockets/gateways#lifecycle-events
  afterInit() {
    this.logger.log('Websocket Server Initialized');
  }

  handleConnection(client: WebSocketClient) {
    client.id = uuidV4();
    client.send(
      JSON.stringify({ status: 'success', action: 'AUTHENTICATE_REQUIRED' }),
    );
    // keep client alive for 1 hour
    this.redisService.set(`client:${client.id}`, {}, { expire: 60 * 60 * 1 });
  }

  handleDisconnect(client: WebSocketClient) {
    this.redisService.remove(`client:${client.id}`);
  }
}
