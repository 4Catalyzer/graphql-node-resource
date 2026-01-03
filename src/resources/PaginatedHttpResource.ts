import HttpResource from './HttpResource';
import HttpApi, { Args } from '../api/HttpApi';

export default class PaginatedHttpResource<
  TApi extends HttpApi = HttpApi,
> extends HttpResource<TApi> {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection<Record<string, any>>(path, args);
  }
}
