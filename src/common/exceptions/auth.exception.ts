import { BaseException } from './base.exception';

export class LoginException extends BaseException {
  constructor(message: string) {
    super('LOGIN', message);
  }
}

export class RegisterException extends BaseException {
  constructor(message: string) {
    super('REGISTER', message);
  }
}
