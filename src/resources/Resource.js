/* @flow */

import type { Context } from '../types/NodeType';

export default class Resource {
  context: Context;

  // eslint-disable-next-line no-unused-vars
  constructor(context: Context, config: any) {
    this.context = context;
  }

  // eslint-disable-next-line no-unused-vars
  get(id: string): ?Object | Promise<?Object> {
    throw new Error('not implemented');
  }

  // TODO: Once we have a concept of a model, this should go on there.
  makeId({ id }: Object): string {
    return id;
  }
}
