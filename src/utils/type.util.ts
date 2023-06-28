export type { PartialDeep } from 'type-fest';

export type OverridesField<
  T,
  Override extends {},
  Discard extends keyof T = keyof {},
> = Omit<T, (keyof Override & keyof T) | Discard> | Override;

export type Obj2UserIdFn = (data: any) => number | number[];
