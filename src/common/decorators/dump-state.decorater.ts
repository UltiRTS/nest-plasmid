import { Obj2String as Obj2StringFn } from '@/utils/type.util';
export const event2StatePath = {};
export function StatePath(path: string | Obj2StringFn) {
  return (
    target: any,
    propertyKey: string | symbol,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    const msg = Reflect.getMetadata('message', propertyDescriptor.value);
    console.log({
      msg,
      path,
      target,
    });
    Reflect.defineMetadata(`statePath:${msg}`, path, target);
    event2StatePath[msg] = path;
    return propertyDescriptor;
  };
}
