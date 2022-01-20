import type { ThunkObjMap, ThunkReadonlyArray } from 'graphql';

function resolveThunk<T>(
  thunk: ThunkReadonlyArray<T> | undefined,
): undefined | T[];
function resolveThunk<T>(
  thunk: ThunkObjMap<T> | undefined,
): undefined | Record<string, T>;
function resolveThunk<T>(
  thunk: ThunkObjMap<T> | ThunkReadonlyArray<T> | undefined,
): any {
  return thunk instanceof Function ? thunk() : thunk;
}

export default resolveThunk;
