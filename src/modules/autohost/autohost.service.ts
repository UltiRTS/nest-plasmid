import { Injectable } from '@nestjs/common';

import { WebSocketClient } from '@/utils/type.util';
import { LoggerProvider } from '@/utils/logger.util';
import { GameConf } from '../game/game.type';
import { createHash } from 'crypto';
import { HostedGame } from './autohost.types';
import { Game } from '../game/game.entity';

interface AutohostClient {
  ws: WebSocketClient;
  id2title: {
    [key: number]: string;
  };
}
@Injectable()
export class AutohostService extends LoggerProvider {
  private loadBalancerCounter = 0;
  private autohosts: { [key: string]: AutohostClient } = Object.create(null);
  private hostGamesById: { [key: string]: HostedGame } = Object.create(null);
  constructor() {
    super();
  }

  register(socket: WebSocketClient) {
    this.autohosts[socket._socket.remoteAddress] = {
      ws: socket,
      id2title: {},
    };
    this.logger.log(`Registered autohost ${socket._socket.remoteAddress}`);
  }

  unregister(socket: WebSocketClient) {
    if (
      socket._socket.remoteAddress in this.autohosts &&
      this.autohosts[socket._socket.remoteAddress].ws == socket
    )
      delete this.autohosts[socket._socket.remoteAddress];

    this.logger.log(`Unregistered autohost ${socket._socket.remoteAddress}`);
  }

  getFreeAutohost(): string {
    const availableIps = Object.keys(this.autohosts);
    return availableIps[this.loadBalancerCounter++ % availableIps.length];
  }

  startGame(conf: GameConf): [string, AutohostClient] {
    if (conf.mgr == null) {
      conf.mgr = this.getFreeAutohost();
    }
    this.autohosts[conf.mgr].id2title[conf.id] = conf.title;
    this.logger.log('occupied: ', this.autohosts[conf.mgr].id2title);
    const gameEntity = new Game();
    this.hostGamesById[conf.id] = {
      autohost: conf.mgr,
      running: false,
      error: '',
      ws: null,
      game: gameEntity,
      lostMarks: {},
    };
    for (const playerName in conf.team) {
      const playerIndex = conf.team[playerName].index;
      const player = conf.team[playerName];
      if (!player.isSpectator) {
        this.hostGamesById[conf.id].lostMarks[playerIndex] = {
          team: player.team,
          lost: false,
          name: playerName,
          isPlayer: !(player.isAI || player.isChicken),
        };
      }
    }
    this.hostGamesById[conf.id].game.game_config = JSON.stringify(conf);
    this.hostGamesById[conf.id].game.team_win = -1;
    if (conf.mgr in this.autohosts) {
      this.hostGamesById[conf.id].ws = this.autohosts[conf.mgr].ws;
      this.autohosts[conf.mgr].ws.send(
        JSON.stringify({
          action: 'startGame',
          parameters: conf,
        }),
      );

      return [conf.mgr, this.autohosts[conf.mgr]];
    } else {
      this.hostGamesById[conf.id].error = 'Autohost not found';
      this.logger.error('Autohost not found');
    }

    return null;
  }
}
