import querystring from 'querystring';
import DataLoader from 'dataloader';
import {
  Connection,
  connectionFromArray,
  forwardConnectionArgs,
} from 'graphql-relay';
import invariant from 'invariant';
import chunk from 'lodash/chunk';
import flatten from 'lodash/flatten';
import omit from 'lodash/omit';
import pick from 'lodash/pick';

import urlJoin from '../utils/urlJoin';
import { HttpMethod } from './fetch';

const PAGINATION_ARG_KEYS = Object.keys(forwardConnectionArgs);

export type Args = Record<string, NodeJS.PoorMansUnknown>;
export type Data = unknown | null | undefined;

export type PaginationResult<T> = Connection<T> & {
  meta: {};
};

export type PaginatedApiResult<T> = Array<T> & {
  meta: {
    cursors?: any;
    hasNextPage?: boolean;
  };
};
export type HttpApiOptions = {
  apiBase: string;
  origin: string;
  externalOrigin: string;
};

export default class HttpApi {
  _origin: string;

  _apiBase: string;

  _externalOrigin: string;

  _loader: DataLoader<any, any>;

  qs = querystring;

  numKeysPerChunk = 25;

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

  get<T>(path: string, args?: Args): Promise<T | null | undefined> {
    return this._loader.load(this.makePath(path, args));
  }

  async getPaginatedConnection<T>(
    path: string,
    { after, first, ...args }: Args,
  ): Promise<PaginationResult<T> | null | undefined> {
    const items = await this.get<PaginatedApiResult<T>>(
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

    const { cursors, hasNextPage, ...meta } = items.meta!;
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
  ): Promise<PaginationResult<T> | null | undefined> {
    const apiArgs = omit(args, PAGINATION_ARG_KEYS);
    const paginationArgs = pick(args, PAGINATION_ARG_KEYS);

    // XXX Need to cast the result of the get to a list
    const items = await this.get<T[]>(this.makePath(path, apiArgs));
    invariant(
      Array.isArray(items),
      `Expected \`GET\` to return an array of items, got: ${typeof items} instead`,
    );

    return {
      ...connectionFromArray(items!, paginationArgs),
      meta: {},
    };
  }

  // eslint-disable-next-line require-await
  async request<T>(
    _method: HttpMethod,
    _reqUrl: string,
    _data?: Data,
  ): Promise<T | null | undefined> {
    throw new Error('Not Implemented');
  }

  post(
    path: string,
    data?: Data,
  ): Promise<Record<string, any> | null | undefined> {
    return this.request('POST', this._getUrl(path), data);
  }

  put(
    path: string,
    data?: Data,
  ): Promise<Record<string, any> | null | undefined> {
    return this.request('PUT', this._getUrl(path), data);
  }

  patch(
    path: string,
    data?: Data,
  ): Promise<Record<string, any> | null | undefined> {
    return this.request('PATCH', this._getUrl(path), data);
  }

  delete(path: string): Promise<Record<string, any> | null | undefined> {
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

  createArgLoader<T extends Record<string, unknown>>(
    path: string,
    key: string,
  ) {
    return this.createLoader<T>(
      keys => this.getUrl(path, { [key]: keys }),
      item => item[key] as string,
    );
  }

  createLoader<T extends Record<string, unknown>>(
    getPath: (keys: string[]) => string,
    getKey: (obj: T) => string,
  ) {
    return new DataLoader<any, any>(async keys => {
      // No need to cache the GET; the DataLoader will cache it.
      const chunkedItems = await Promise.all(
        chunk<string>(keys, this.numKeysPerChunk).map(chunkKeys =>
          this.request<T[]>('GET', getPath(chunkKeys)),
        ),
      );
      const items = flatten<T | null | undefined>(chunkedItems).filter(
        Boolean,
      ) as T[];

      const itemsByKey: Record<string, T[]> = {};
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
