import Resource from './Resource.js';
import HttpApi from '../api/HttpApi.js';
import type { Args, Data } from '../api/HttpApi.js';
import type { Context } from '../types/Context.js';
import type { Maybe, Obj } from '../utils/typing.js';
import urlJoin from '../utils/urlJoin.js';

export type Endpoint = string | ((id?: string) => string);

export type HttpContext<TApi extends HttpApi = HttpApi> = Context & {
  readonly httpApi: TApi;
};

export type HttpResourceOptions = {
  endpoint: Endpoint;
};

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
