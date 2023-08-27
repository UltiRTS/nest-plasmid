import { Obj2UsernameFn } from '@/utils/type.util';

export function DumpState(how: Obj2UsernameFn) {
  return (
    target: any,
    propertyKey: string | symbol,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    const msg = Reflect.getMetadata('message', propertyDescriptor.value);
    Reflect.defineMetadata(`transform:${msg}`, how, target);
    return propertyDescriptor;
  };
}
