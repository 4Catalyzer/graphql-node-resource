import { Maybe, Obj } from '../utils/typing';

export default abstract class Resource<TContext = any> {
  protected constructor(public readonly context: TContext) {}

  abstract get(id?: string): Promise<Maybe<Obj>>;
}
