export class BaseException extends Error {
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }

  private code: string;
}
