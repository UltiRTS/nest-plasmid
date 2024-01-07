import { AllExceptionsFilter } from '@/common/filters/all.filter';
import { BaseExceptionsFilter } from '@/common/filters/exception.filter';
import { ClientsService } from '@/modules/clients/clients.service';
import { RedisService } from '@/modules/redis/redis.service';
import { UserLoginDto } from '@/modules/user/dtos/user.login.dto';
import { UserRegisterDto } from '@/modules/user/dtos/user.register.dto';
import { UserService } from '@/modules/user/user.service';
import { LoggerProvider } from '@/utils/logger.util';
import { State } from '@/utils/statedict';
import { WebSocketClient } from '@/utils/type.util';
import { Inject, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { v4 as uuidV4 } from 'uuid';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'ws';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class UserGateway extends LoggerProvider {
  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly clientsService: ClientsService,
  ) {
    super();
    this.logger.log('LoginGateway started');
  }

  @WebSocketServer()
  server: Server<WebSocketClient>;

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
    this.clientsService.set(user.username, client);
    return await this.redisService.dump(user.username);
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
    if (this.clientsService.get(client.username)) {
      this.clientsService.remove(client.username);
    }
  }
}
