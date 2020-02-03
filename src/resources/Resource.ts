import { Maybe, Obj } from '../utils/typing';

export default abstract class Resource<TContext = any> {
  context: TContext;

  constructor(context: TContext) {
    this.context = context;
  }

  abstract get(id: string): Promise<Maybe<Obj>>;
}
