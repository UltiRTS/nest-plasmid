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
import { UserState } from '../redis/dtos/redis.user.dto';
import { ChatRoomState } from '@/utils/statedict';

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

  async joinRoom(
    dto: RoomJoinDto & { username: string },
  ): Promise<ChatRoomState> {
    const { username, chatName, password } = dto;
    const userLock = await this.redisService.lock(`lock:user:${username}`);
    const roomLock = await this.redisService.lock(`lock:room:${chatName}`);
    if (!userLock || !roomLock) {
      throw new NoPrivilegesException('You are already in this room');
    }
    let room = await this.chatRoomRepository.findOne({
      where: { roomName: chatName },
    });

    if (!room) {
      room = this.chatRoomRepository.create({
        roomName: chatName,
        password,
      });
      room = await this.chatRoomRepository.save(room);
      await this.redisService.set<ChatRoomState>(`room:${room.roomName}`, {
        members: [username],
        createAt: new Date().toISOString(),
        roomName: room.roomName,
        password: room.password,
      });
    }
    let roomState = await this.redisService.get<ChatRoomState>(
      `room:${room.roomName}`,
    );
    const { members } = roomState;
    if (!members.includes(username)) {
      if (room.password && room.password !== password) {
        throw new NoPrivilegesException('Wrong password');
      }
      roomState = {
        ...roomState,
        members: [...members, username],
      };
      await this.redisService.set<ChatRoomState>(
        `room:${room.roomName}`,
        roomState,
      );
    }
    const userState = await this.redisService.get<UserState>(
      `userState:${username}`,
    );
    if (!(chatName in userState.chatRooms)) {
      userState.chatRooms = [...userState.chatRooms, chatName];
      await this.redisService.set(`userState:${username}`, userState);
    }
    await this.redisService.unlock(`lock:user:${username}`);
    await this.redisService.unlock(`lock:room:${chatName}`);
    return roomState;
  }

  async leaveRoom(dto: RoomLeaveDto & { username: string }): Promise<string[]> {
    const { username, chatName } = dto;
    const userLock = await this.redisService.lock(`lock:user:${username}`);
    const roomLock = await this.redisService.lock(`lock:room:${chatName}`);
    if (!userLock || !roomLock) {
      throw new NoPrivilegesException('You are already in this room');
    }

    const room = await this.chatRoomRepository.findOne({
      where: { roomName: chatName },
    });
    const chatRoom = await this.redisService.get<ChatRoomState>(
      `room:${room.id}`,
    );
    chatRoom.members = chatRoom.members.filter((member) => member !== username);
    const userState = await this.redisService.get<UserState>(
      `userState:${username}`,
    );
    userState.chatRooms = userState.chatRooms.filter(
      (chatRoom) => chatRoom !== chatName,
    );

    await this.redisService.set(`room:${room.id}`, chatRoom);
    await this.redisService.set(`userState:${username}`, userState);

    await this.redisService.unlock(`lock:user:${username}`);
    await this.redisService.unlock(`lock:room:${chatName}`);

    return userState.chatRooms;
  }

  async sayRoom(
    dto: RoomSayDto & { username: string },
  ): Promise<ChatRoomState> {
    const { username, chatName, message } = dto;
    const roomLock = await this.redisService.lock(`lock:room:${chatName}`);
    if (!roomLock) {
      throw new NoPrivilegesException('You are already in this room');
    }
    const user = await this.userRepository.findOne({ where: { username } });
    // get room data from db
    const room = await this.chatRoomRepository.findOne({
      where: { roomName: chatName },
    });
    // get room state from redis
    const roomState = await this.redisService.get<ChatRoomState>(
      `room:${room.id}`,
    );
    const { members } = roomState;
    if (!members.includes(username)) {
      throw new NoPrivilegesException('You are not in this room');
    }
    // make the new message last message
    // save it to db and redis
    roomState.lastMessage = {
      author: username,
      content: message,
      time: Date.now(),
    };
    const chat = this.chatRepository.create({
      message,
      author: user,
      room,
    });

    this.redisService.unlock(`lock:room:${chatName}`);
    return roomState;
  }
}
