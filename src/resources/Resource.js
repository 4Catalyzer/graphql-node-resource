/* @flow */

import type { Args } from '../api/HttpApi';

export default class Resource<TContext> {
  context: TContext;

  // eslint-disable-next-line no-unused-vars
  constructor(context: TContext, config: any) {
    this.context = context;
  }

  // eslint-disable-next-line no-unused-vars
  get(id: string, args?: Args): ?Object | Promise<?Object> {
    throw new Error('not implemented');
  }

  // TODO: Once we have a concept of a model, this should go on there.
  makeId({ id }: any): string {
    return id;
  }
}
