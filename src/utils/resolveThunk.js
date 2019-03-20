/* @flow */

import type { Thunk } from 'graphql';

export default function resolveThunk<T>(thunk: Thunk<T>): T {
  // $FlowFixMe
  return typeof thunk === 'function' ? thunk() : thunk;
}
