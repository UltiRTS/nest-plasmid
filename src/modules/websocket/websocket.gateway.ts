import 'reflect-metadata';
import { LoggerProvider } from '@/utils/logger.util';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { UseFilters, UsePipes } from '@nestjs/common';

import { ValidationPipe } from '@/common/pipes/validation.pipe';

import { UserRegisterDto } from '@/modules/user/dtos/user.register.dto';
import { WebsocketExceptionsFilter } from '@/common/filters/websocket.filter';
import { Server } from 'ws';

// TODO: remove cors on production
// You can test this in https://www.piesocket.com/socketio-tester
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway extends LoggerProvider {
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
  ): Promise<UserRegisterDto> {
    this.logger.debug('register: ', data);
    return data;
  }

  // lifecycle reference: https://docs.nestjs.com/websockets/gateways#lifecycle-events
  afterInit() {
    this.logger.log('Websocket Server Initialized');
  }
}
