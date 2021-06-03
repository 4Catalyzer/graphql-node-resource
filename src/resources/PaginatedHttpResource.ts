import HttpApi, { Args } from '../api/HttpApi';
import HttpResource from './HttpResource';

export default class PaginatedHttpResource<
  TApi extends HttpApi = HttpApi,
> extends HttpResource<TApi> {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection<Record<string, any>>(path, args);
  }
}
