/* @flow */

import HttpResource from './HttpResource';
import type { HttpContext } from './HttpResource';
import type HttpApi, { Args } from '../api/HttpApi';

export default class PaginatedHttpResourceHttpResource<
  TApi: HttpApi = HttpApi,
  TContext: HttpContext<TApi> = HttpContext<HttpApi>,
> extends HttpResource<TApi, TContext> {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection(path, args);
  }
}
