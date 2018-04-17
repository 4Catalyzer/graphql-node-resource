/* @flow */

import type { Args } from '../api/HttpApi';
import HttpResource from './HttpResource';
import type { HttpContext } from './HttpResource';

export default class PaginatedHttpResource<
  TContext: HttpContext,
> extends HttpResource<TContext> {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection(path, args);
  }
}
