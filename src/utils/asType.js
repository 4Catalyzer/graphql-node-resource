/* @flow */

export default function asType<T, SubT: T>(obj: T, klass: Class<SubT>): SubT {
  if (!(obj instanceof klass)) {
    throw new Error(`${String(obj)} is not an instance of ${String(klass)}`);
  }
  return obj;
}
