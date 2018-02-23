/* @flow */

import type HttpApi, { Args, Data } from '../api/HttpApi';
import type { Context } from '../types/NodeType';
import defaultUrlJoin from '../utils/urlJoin';
import Resource from './Resource';

export type Endpoint = string | ((id?: string) => string);

export type HttpResourceOptions = {
  endpoint: Endpoint,
  urlJoin?: (...paths: Array<?string>) => string,
};

export default class HttpResource extends Resource {
  api: HttpApi;
  options: HttpResourceOptions;
  _endpoint: Endpoint;
  _urlJoin: (...paths: Array<?string>) => string;

  constructor(context: Context, { endpoint, urlJoin }: HttpResourceOptions) {
    super(context);

    this.api = context.httpApi;
    this._urlJoin = urlJoin || defaultUrlJoin;
    this._endpoint = endpoint;
  }

  get(id?: string): ?Object | Promise<?Object> {
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

    return this._urlJoin(endpoint, id);
  }

  getSubPath(id: string, path: string) {
    return this._urlJoin(this.getPath(id), path);
  }

  getConnectionBase(path: string, args: Args) {
    return this.api.getUnpaginatedConnection(path, args);
  }
}
