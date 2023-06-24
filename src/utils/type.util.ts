export type { PartialDeep } from 'type-fest';

export type OverridesField<
  T,
  Override extends {},
  Discard extends keyof T = keyof {},
> = Omit<T, (keyof Override & keyof T) | Discard> | Override;
