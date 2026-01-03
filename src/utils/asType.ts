import _ from 'lodash';
import type { Class } from 'utility-types';

export default function asType<T, SubT extends T>(
  obj: T,
  klass: Class<SubT>,
): SubT {
  if (!(obj instanceof klass)) {
    const ctor =
      _.isObject(obj) &&
      (obj as object).constructor &&
      (obj as object).constructor.name;
    throw new Error(
      `"${String(ctor || obj)}" is not an instance of ${String(klass)}`,
    );
  }
  return obj;
}
