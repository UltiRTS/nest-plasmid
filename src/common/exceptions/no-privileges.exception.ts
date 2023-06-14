import { BaseException } from './base.exception';

export class NoPrivilegesException extends BaseException {
  constructor(message: string) {
    super('NO_PRIVILEGES', message);
  }
}
