/* @flow */

import DataLoader from 'dataloader';
import { connectionFromArray, forwardConnectionArgs } from 'graphql-relay';
import type { Connection } from 'graphql-relay';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import invariant from 'invariant';
import querystring from 'querystring';

import urlJoin from '../utils/urlJoin';
import type { HttpMethod } from './fetch';

const PAGINATION_ARG_KEYS = Object.keys(forwardConnectionArgs);

export type Args = { [key: string]: mixed };
export type Data = ?mixed;

export type QueryString = {
  parse<T>(query: string): T,
  stringify(obj: Object): string,
};

export type PaginationResult<T> = Connection<T> & {
  meta: {},
};

export type HttpApiOptions = {
  apiBase: string,
  origin: string,
  externalOrigin: string,
};

export default class HttpApi {
  _origin: string;
  _apiBase: string;
  _externalOrigin: string;
  _loader: DataLoader<*, *>;

  qs: QueryString = querystring;

  constructor({ apiBase, origin, externalOrigin }: HttpApiOptions) {
    this._origin = origin;
    this._externalOrigin = externalOrigin;
    this._apiBase = apiBase;

    this._loader = new DataLoader(paths =>
      Promise.all(
        // Don't fail the entire batch on a single failed request.
        paths.map(path =>
          this.request('GET', this._getUrl(path)).catch(e => e),
        ),
      ),
    );
  }

  get<T>(path: string, args?: Args): Promise<?T> {
    return this._loader.load(this.makePath(path, args));
  }

  async getPaginatedConnection<T>(
    path: string,
    { after, first, ...args }: Args,
  ): Promise<?PaginationResult<T>> {
    const items = await this.get(
      this.makePath(path, {
        ...args,
        cursor: after,
        limit: first,
        pageSize: first,
      }),
    );

    if (!items) {
      return null;
    }

    invariant(
      items.meta,
      'Unexpected format. `GET` should return an array of items with a ' +
        '`meta` property containing an array of cursors and `hasNextPage`',
    );

    const { cursors, hasNextPage, ...meta } = items.meta;
    const lastIndex = items.length - 1;

    // These connections only paginate forward, so the existence of a previous
    // page doesn't make any difference, but this is the correct value.
    const hasPreviousPage = !!after;
    return {
      edges: items.map((item, i) => ({
        node: item,
        cursor: cursors[i],
      })),
      pageInfo: {
        startCursor: items[0] ? cursors[0] : null,
        endCursor: items[lastIndex] ? cursors[lastIndex] : null,
        hasPreviousPage,
        hasNextPage,
      },
      meta,
    };
  }

  async getUnpaginatedConnection<T>(
    path: string,
    args: Args,
  ): Promise<?PaginationResult<T>> {
    const apiArgs = omit(args, PAGINATION_ARG_KEYS);
    const paginationArgs = pick(args, PAGINATION_ARG_KEYS);

    // XXX Need to cast the result of the get to a list
    const items = await this.get(this.makePath(path, apiArgs));
    invariant(
      Array.isArray(items),
      `Expected \`GET\` to return an array of items, got: ${typeof items} instead`,
    );

    return {
      ...connectionFromArray(items, paginationArgs),
      meta: {},
    };
  }

  async request<T>(
    method: HttpMethod,
    reqUrl: string,
    data?: Data, // eslint-disable-line no-unused-vars
  ): Promise<?T> {
    throw new Error('Not Implemented');
  }

  post(path: string, data?: Data): Promise<?Object> {
    return this.request('POST', this._getUrl(path), data);
  }

  put(path: string, data?: Data): Promise<?Object> {
    return this.request('PUT', this._getUrl(path), data);
  }

  patch(path: string, data?: Data): Promise<?Object> {
    return this.request('PATCH', this._getUrl(path), data);
  }

  delete(path: string): Promise<?Object> {
    return this.request('DELETE', this._getUrl(path));
  }

  makePath(path: string, args?: Args): string {
    if (!args) {
      return path;
    }

    const [pathBase, searchBase] = path.split('?');

    // TODO: Is this needed can we just insist queries are passed in as objects?
    const query = searchBase ? this.qs.parse(searchBase) : null;
    const search = this.qs.stringify({ ...query, ...args });

    if (!search) {
      return pathBase;
    }

    return `${pathBase}?${search}`;
  }

  createArgLoader(path: string, key: string) {
    return this.createLoader(
      keys => this.getUrl(path, { [key]: keys }),
      item => item[key],
    );
  }

  createLoader<T>(
    getPath: (keys: string[]) => string,
    getKey: (obj: T) => string,
  ) {
    return new DataLoader(async keys => {
      // No need to cache the GET; the DataLoader will cache it.
      const items = await this.request('GET', getPath((keys: any)));
      if (!items) {
        return Array(keys.length).fill(null);
      }

      const itemsByKey = {};
      keys.forEach(key => {
        itemsByKey[key] = [];
      });
      items.forEach(item => {
        const key = getKey(item);
        if (itemsByKey[key]) {
          itemsByKey[key].push(item);
        }
      });

      return keys.map(key => itemsByKey[key]);
    });
  }

  getUrl(path: string, args?: Args): string {
    return this._getUrl(this.makePath(path, args));
  }

  getExternalUrl(path: string, args?: Args): string {
    return this._getUrl(this.makePath(path, args), this._externalOrigin);
  }

  _getUrl(path: string, origin: string = this._origin) {
    return `${origin}${urlJoin(this._apiBase, path)}`;
  }
}
