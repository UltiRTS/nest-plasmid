import { Obj2String as Obj2StringFn } from '@/utils/type.util';

export function StatePath(path: string | Obj2StringFn) {
  return (
    target: any,
    propertyKey: string | symbol,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    const msg = Reflect.getMetadata('message', propertyDescriptor.value);
    Reflect.defineMetadata(`statePath:${msg}`, path, target);
    return propertyDescriptor;
  };
}
