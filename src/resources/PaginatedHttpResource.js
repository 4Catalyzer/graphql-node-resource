/* @flow */

import HttpResource from './HttpResource';
import type HttpApi, { Args } from '../api/HttpApi';

export default class PaginatedHttpResource<
  TApi: HttpApi = HttpApi,
> extends HttpResource<TApi> {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection<Object>(path, args);
  }
}
