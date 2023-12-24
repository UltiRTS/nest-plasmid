import { StatePath } from '@/common/decorators/dump-state.decorater';
import { AllExceptionsFilter } from '@/common/filters/all.filter';
import { BaseExceptionsFilter } from '@/common/filters/exception.filter';
import { AuthGuard } from '@/common/guards/auth.guard';
import { ChatRoom } from '@/modules/chat/chat.entity';
import { ChatService } from '@/modules/chat/chat.service';
import { RoomJoinDto } from '@/modules/chat/dtos/room.join.dto';
import { RoomLeaveDto } from '@/modules/chat/dtos/room.leave.dto';
import { RoomSayDto } from '@/modules/chat/dtos/room.say.dto';
import { ClientsService } from '@/modules/clients/clients.service';
import { RedisService } from '@/modules/redis/redis.service';
import { LoggerProvider } from '@/utils/logger.util';
import { ChatRoomState } from '@/utils/statedict';
import { WebSocketClient, Response } from '@/utils/type.util';
import {
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { OPEN } from 'ws';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway extends LoggerProvider {
  constructor(
    private readonly chatService: ChatService,
    private readonly clientsService: ClientsService,
    private readonly redisService: RedisService,
  ) {
    super();
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
  ): Promise<string[]> {
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
  private broadcastMessage<T>(message: Response<T>, recipeints: string[]) {
    recipeints.forEach((username) => {
      const client = this.clientsService.get(username);
      if (client && client.readyState === OPEN) {
        client.send(JSON.stringify(message));
      }
    });
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
  async;
}
