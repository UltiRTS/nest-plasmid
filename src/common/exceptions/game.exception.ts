import { BaseException } from './base.exception';

export class JoinGameExcption extends BaseException {
  constructor(message: string) {
    super('JOINGAME', message);
  }
}
