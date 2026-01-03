import HttpResource from './HttpResource.js';
import HttpApi from '../api/HttpApi.js';
import type { Args } from '../api/HttpApi.js';

export default class PaginatedHttpResource<
  TApi extends HttpApi = HttpApi,
> extends HttpResource<TApi> {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection<Record<string, any>>(path, args);
  }
}
