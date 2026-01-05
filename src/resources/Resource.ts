import type { Maybe, Obj } from '../utils/typing.js';

export default abstract class Resource<TContext = any> {
  protected constructor(public readonly context: TContext) {}

  abstract get(id?: string): Promise<Maybe<Obj>>;
}
