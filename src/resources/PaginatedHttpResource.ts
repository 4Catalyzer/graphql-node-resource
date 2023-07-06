import HttpApi, { Args } from '../api/HttpApi';
import HttpResource from './HttpResource';

/**
 * This resource supports endpoints that adhere to the relay connection spec. Use `getConnection` to fetch
 * the connection.
 */
export default class PaginatedHttpResource<
  TApi extends HttpApi = HttpApi,
> extends HttpResource<TApi> {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection<Record<string, any>>(path, args);
  }
}
