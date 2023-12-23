import { State } from './statedict';
import { WebSocket } from 'ws';
export type { PartialDeep } from 'type-fest';

export type OverridesField<
  T,
  Override extends {},
  Discard extends keyof T = keyof {},
> = Omit<T, (keyof Override & keyof T) | Discard> | Override;
export type WebSocketClient = WebSocket & {
  id: string;
  userId?: number;
  username?: string;
};

export type Obj2String = (data: any) => string | string[];
export type Response<T = State> = {
  status: 'success' | 'error';
  action: string;
  state: T;
  path: string;
  seq: number;
};

export type Path<T> = T extends object
  ? {
      [K in keyof T]: K extends string | number
        ? `${K}` | `${K}.${Path<T[K]>}`
        : never;
    }[keyof T]
  : never;

export type Select<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]>
      ? Select<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
