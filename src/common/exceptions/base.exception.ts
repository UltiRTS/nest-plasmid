export class BaseException {
  constructor(public readonly from: string, public readonly message: string) {}
}

export class BroadcastException extends BaseException {
  constructor(
    public readonly from: string,
    public readonly message: string,
    public readonly recipients: string[],
  ) {
    super(from, message);
  }
}
