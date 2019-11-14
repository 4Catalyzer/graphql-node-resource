export default abstract class Resource<TContext> {
  context: TContext;

  constructor(context: TContext) {
    this.context = context;
  }

  abstract get(
    _id: string,
  ):
    | (Record<string, any> | null | undefined)
    | Promise<Record<string, any> | null | undefined>;

  // TODO: Once we have a concept of a model, this should go on there.
  makeId({ id }: any): string {
    return id;
  }
}
