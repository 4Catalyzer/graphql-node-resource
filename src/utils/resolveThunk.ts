import { Thunk } from 'graphql';

function isFunction<T>(fn: unknown): fn is () => T {
  return typeof fn === 'function';
}
export default function resolveThunk<T>(thunk: Thunk<T>): T {
  return isFunction(thunk) ? thunk() : thunk;
}
