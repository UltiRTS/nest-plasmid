import 'reflect-metadata';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Server, WebSocket, OPEN } from 'ws';

import { ValidationPipe } from '@/common/pipes/validation.pipe';
import { AllExceptionsFilter } from '@/common/filters/all.filter';
import { BaseExceptionsFilter } from '@/common/filters/exception.filter';
import { AuthGuard } from '@/common/guards/auth.guard';
import { LoggerProvider } from '@/utils/logger.util';

import { GameService } from '@/modules/game/game.service';
import { StatePath } from '@/common/decorators/dump-state.decorater';
import { Response } from '@/utils/type.util';
import { JoinGameDto } from '../../game/dtos/game.join.dto';
import { GameRoom, GameRoomPlayer } from '../../game/dtos/game.game-room.dto';
import { SetTeamDto } from '../../game/dtos/game.set-team.dto';
import { SetMapDto } from '../../game/dtos/game.set-map.dto';
import { SetAiDto } from '../../game/dtos/game.set-ai.dto';
import { ClientsService } from '../../clients/clients.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { StartGameDto } from '@/modules/game/dtos/game.start-game.dto';
import { HasMapDto } from '@/modules/game/dtos/game.has-map.dto';
import { LeaveGameDto } from '@/modules/game/dtos/game.leave-game.dto';
import { flatMap } from 'lodash';
import { UserState } from '@/modules/redis/dtos/redis.user.dto';
import { MidJoinDto } from '@/modules/game/dtos/game.mid-join.dto';
import { SetModDto } from '@/modules/game/dtos/game.set-mod.dto';
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
export class GameGateway extends LoggerProvider {
  constructor(
    private readonly gameService: GameService,
    private readonly clientsService: ClientsService,
  ) {
    super();
  }

  @WebSocketServer()
  server: Server<WebSocketClient>;

  @StatePath('user.game')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('JOINGAME')
  async joinGame(
    @MessageBody() joinGameDto: JoinGameDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom> {
    // this.logger.debug('join game: ', { data: joinGameDto, client });
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

  @StatePath('user.game.players')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('SETTEAM')
  async setTeam(
    @MessageBody() data: SetTeamDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom['players']> {
    const username = client.username;
    const players = await this.gameService.setTeam(data, username);
    const message: Response<GameRoom['players']> = {
      status: 'success',
      action: 'SETTEAM',
      path: `user.game.players`,
      state: players,
      seq: -1,
    };
    this.broadcastMessage(
      message,
      Object.keys(players).filter((username) => username !== client.username),
    );
    return players;
  }

  @StatePath('user.game.mapId')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('SETMAP')
  async setMap(
    @MessageBody() data: SetMapDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom['mapId']> {
    const username = client.username;
    const room = await this.gameService.setMap(data, username);
    const message: Response<GameRoom['mapId']> = {
      status: 'success',
      action: 'SETMAP',
      path: `user.game.mapId`,
      state: room.mapId,
      seq: -1,
    };
    this.broadcastMessage(
      message,
      Object.keys(room.players).filter(
        (username) => username !== client.username,
      ),
    );
    return room.mapId;
  }

  @StatePath('user.game.players')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('HASMAP')
  async hasMap(
    @MessageBody() data: HasMapDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom['players']> {
    const username = client.username;
    const room = await this.gameService.hasMap(data, username);
    this.logger.debug("room", room)
    const message: Response<GameRoom['players']> = {
      status: 'success',
      action: 'HASMAP',
      path: `user.game.players`,
      state: room.players,
      seq: -1,
    };
    this.broadcastMessage(
      message,
      Object.keys(room.players).filter(
        (username) => username !== client.username,
      ),
    );
    return room.players;
  }

  @StatePath('user.game')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('SETAI')
  async setAi(
    @MessageBody() data: SetAiDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom> {
    const username = client.username;
    const room = await this.gameService.setAi(data, username);
    this.logger.debug(JSON.stringify(room))
    const message: Response<GameRoom> = {
      status: 'success',
      action: 'SETAI',
      path: `user.game`,
      state: room,
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
  private broadcastMessage<T>(message: Response<T>, recipeints: string[]) {
    this.clientsService.broadcast(recipeints, message);
  }

  @StatePath('user.game')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('STARTGAME')
  async startGame(
    @MessageBody() data: StartGameDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom> {
    const username = client.username;
    const room = await this.gameService.startGame(data, username)
    this.logger.debug(JSON.stringify(room))
    const message: Response<GameRoom> = {
      status: 'success',
      action: 'STARTGAME',
      path: `user.game`,
      state: room,
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

  @StatePath('user.game')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('KILLENGINE')
  async killEngine(
    @MessageBody() data: StartGameDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom> {
    const username = client.username;
    const room = await this.gameService.killEngine(data, username)
    this.logger.debug(JSON.stringify(room))
    const message: Response<GameRoom> = {
      status: 'success',
      action: 'STARTGAME',
      path: `user.game`,
      state: room,
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

  @StatePath('user')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('LEAVEGAME')
  async leaveGame(
    @MessageBody() data: LeaveGameDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<UserState> {
    const username = client.username;
    const {room, user} = await this.gameService.leaveGame(data, username)
    const message: Response<UserState> = {
      status: 'success',
      action: 'LEAVEGAME',
      path: `user`,
      state: null,
      seq: -1,
    };
    this.broadcastMessage(
      message,
      Object.keys(room.players).filter(
        (username) => username !== client.username,
      ),
    );
    this.logger.debug("leaved game")
    return user;
  }

  @StatePath('user.game')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('MIDJOIN')
  async midJoin(
    @MessageBody() data: MidJoinDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom> {
    const username = client.username;
    const room = await this.gameService.midJoin(data, username)
    return room;
  }

  @StatePath('user.game')
  @UseFilters(new AllExceptionsFilter(), new BaseExceptionsFilter())
  @UseGuards(new AuthGuard())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('SETMOD')
  async setMod(
    @MessageBody() data: SetModDto,
    @ConnectedSocket() client: WebSocketClient,
  ): Promise<GameRoom> {
    const username = client.username;
    const room = await this.gameService.setMod(data, username)
    const message: Response<GameRoom> = {
      status: 'success',
      action: 'SETMOD',
      path: `user.game`,
      state: room,
      seq: -1,
    };
    this.broadcastMessage(
      message,
      Object.keys(room.players).filter(
        (username) => username !== client.username,
      ),
    );
    this.logger.debug("broadcasting setmod")
    return room;
  }

}
