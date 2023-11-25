import { BaseException } from './base.exception';

export class JoinGameExcption extends BaseException {
  constructor(message: string) {
    super('JOINGAME', message);
  }
}

export class GameRoomException extends BaseException {
  constructor(action: string, message: string) {
    super(action, message);
  }
}
