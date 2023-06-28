import { Obj2UserIdFn } from '@/utils/type.util';

export function DumpState(how: Obj2UserIdFn) {
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
