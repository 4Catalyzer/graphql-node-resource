import HttpApi, { Args, Data } from '../api/HttpApi';
import { Context } from '../types/Context';
import { Maybe, Obj } from '../utils/typing';
import urlJoin from '../utils/urlJoin';
import Resource from './Resource';

export type Endpoint = string | ((id?: string) => string);

export type HttpContext<TApi extends HttpApi = HttpApi> = Context & {
  readonly httpApi: TApi;
};

export type HttpResourceOptions = {
  endpoint: Endpoint;
};

/**
 * This represents a standard REST resource that folows the CRUD
 * pattern. Its used by the NodeType class to fetch the
 * resource. It can also be used within mutations to modify or create
 * resources.
 * 
 * This class assumes the resource does not provide a paginated connection
 * response. For resources that support the connection spec, 
 * use {@link PaginatedHttpResource}.
 * 
 * To get a NodeType's resource, use {@link NodeType.getResource}.
 */
export default class HttpResource<
  TApi extends HttpApi = HttpApi,
  TContext extends HttpContext<TApi> = HttpContext<TApi>,
> extends Resource<TContext> {
  readonly api: TApi;

  protected readonly _endpoint: Endpoint;

  constructor(context: TContext, { endpoint }: HttpResourceOptions) {
    super(context);

    this.api = context.httpApi;
    this._endpoint = endpoint;
  }

  get(id?: string): Promise<Maybe<Obj>> {
    return this.api.get(this.getPath(id));
  }

  getConnection(args: Args) {
    return this.getConnectionBase(this.getPath(), args);
  }

  create(data: Data) {
    return this.api.post(this.getPath(), data);
  }

  update(id: string, data?: Data) {
    return this.api.patch(this.getPath(id), data);
  }

  set(id: string, data?: Data) {
    return this.api.put(this.getPath(id), data);
  }

  delete(id: string) {
    return this.api.delete(this.getPath(id));
  }

  getPath(id?: string) {
    const endpoint = this._endpoint;
    if (typeof endpoint === 'function') {
      return endpoint(id);
    }

    return urlJoin(endpoint, id);
  }

  getSubPath(id: string, path: string) {
    return urlJoin(this.getPath(id), path);
  }

  getConnectionBase(path: string, args: Args) {
    return this.api.getUnpaginatedConnection<Record<string, any>>(path, args);
  }
}
