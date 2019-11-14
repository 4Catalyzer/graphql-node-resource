import { Thunk } from 'graphql';

export default function resolveThunk<T>(thunk: Thunk<T>): T {
  return thunk instanceof Function ? thunk() : thunk;
}
