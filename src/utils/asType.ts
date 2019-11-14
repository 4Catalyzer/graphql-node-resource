import { Class } from 'utility-types';

export default function asType<T extends object, SubT extends T>(
  obj: T,
  klass: Class<SubT>,
): SubT {
  if (!(obj instanceof klass)) {
    const ctor =
      typeof obj === 'object' && obj.constructor && obj.constructor.name;
    throw new Error(
      `"${String(ctor || obj)}" is not an instance of ${String(klass)}`,
    );
  }
  return obj;
}
