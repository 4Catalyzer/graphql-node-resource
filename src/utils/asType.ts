import isObject from 'lodash/isObject';
import { Class } from 'utility-types';

export default function asType<T, SubT extends T>(
  obj: T,
  klass: Class<SubT>,
): SubT {
  if (!(obj instanceof klass)) {
    const ctor = isObject(obj) && obj.constructor && obj.constructor.name;
    throw new Error(
      `"${String(ctor || obj)}" is not an instance of ${String(klass)}`,
    );
  }
  return obj;
}
