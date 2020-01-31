export default abstract class Resource<TContext = any, TSource = any> {
  context: TContext;

  constructor(context: TContext) {
    this.context = context;
  }

  abstract get(
    _id: string,
  ): (TSource | null | undefined) | Promise<TSource | null | undefined>;
}
