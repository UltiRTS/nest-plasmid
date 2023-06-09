import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import _ from 'lodash';

import { NoPrivilegesException } from '@/common/exceptions/no-privileges.exception';
import { RedisService } from '@/modules/redis/redis.service';
import { User } from '@/modules/user/user.entity';
import { LoggerProvider } from '@/utils/logger.util';

import { Chat, ChatRoom } from './chat.entity';
import { RoomJoinDto } from './dtos/room.join.dto';
import { RoomLeaveDto } from './dtos/room.leave.dto';
import { RoomSayDto } from './dtos/room.say.dto';

@Injectable()
export class ChatService extends LoggerProvider {
  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  async joinRoom(dto: RoomJoinDto & { userId: number }): Promise<ChatRoom> {
    const { userId, chatName, password } = dto;
    let room = await this.chatRoomRepository.findOne({
      where: { roomName: chatName },
    });

    if (!room) {
      room = this.chatRoomRepository.create({
        roomName: chatName,
        password,
      });
      room = await this.chatRoomRepository.save(room);
      await this.redisService.set(`room:${room.id}`, { users: [userId] });
    }
    const { users } = await this.redisService.get(`room:${room.id}`);
    if (!users.includes(userId)) {
      if (room.password && room.password !== password) {
        throw new NoPrivilegesException('Wrong password');
      }
      await this.redisService.set(`room:${room.id}`, {
        users: [...users, userId],
      });
    }
    return room;
  }

  async leaveRoom(dto: RoomLeaveDto & { userId: number }): Promise<{}> {
    const { userId, chatName } = dto;
    const room = await this.chatRoomRepository.findOne({
      where: { roomName: chatName },
    });
    const { users } = await this.redisService.get(`room:${room.id}`);
    await this.redisService.set(`room:${room.id}`, {
      users: _.remove(users, (id) => id === userId),
    });
    return {};
  }

  async sayRoom(dto: RoomSayDto & { userId: number }): Promise<Chat> {
    const { userId, chatName, message } = dto;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const room = await this.chatRoomRepository.findOne({
      where: { roomName: chatName },
    });
    const { users } = await this.redisService.get(`room:${room.id}`);
    if (!users.includes(userId)) {
      throw new NoPrivilegesException('You are not in this room');
    }
    const chat = this.chatRepository.create({
      message,
      author: user,
      room,
    });
    return await this.chatRepository.save(chat);
  }
}
