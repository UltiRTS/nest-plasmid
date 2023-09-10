import { State } from './statedict';

export type { PartialDeep } from 'type-fest';

export type OverridesField<
  T,
  Override extends {},
  Discard extends keyof T = keyof {},
> = Omit<T, (keyof Override & keyof T) | Discard> | Override;

export type Obj2String = (data: any) => string | string[];
export type Response<T = State> = {
  status: 'success' | 'error';
  action: string;
  state: T;
  path: string;
  seq: number;
};
