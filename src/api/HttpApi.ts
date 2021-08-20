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

import { Maybe, Obj } from '../utils/typing';
import urlJoin from '../utils/urlJoin';
import { HttpMethod } from './fetch';

const PAGINATION_ARG_KEYS = Object.keys(forwardConnectionArgs);

export type Args = { [key: string]: unknown };
export type Data = unknown | null | undefined;

export type QueryString = {
  parse(query: string): Record<string, any>;
  stringify(obj: Record<string, any>): string;
};

export type PaginationResult<T> = Connection<T> & {
  meta: unknown;
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

/**
 * An HTTP request helper class oriented towards fetching resources
 * from well structured REST endpoints. HttpApi includes simple support for
 * batching and caching requests. Requests are cached using
 * [DataLoader](https://github.com/graphql/dataloader/blob/v2.0.0/README.md)
 */
export default abstract class HttpApi {
  private origin: string;

  private apiBase: string;

  private externalOrigin: string;

  private loader: DataLoader<string, any>;

  /** The serializer and deserializer used for query parameters */
  readonly qs: QueryString = querystring;

  /** 
  DataLoader requests with many keys will be split into multiple 
  requests to avoid hitting URL size limits. The default works well for 
  chunking UUID keys
  */
  readonly numKeysPerChunk = 25;

  constructor({ apiBase, origin, externalOrigin }: HttpApiOptions) {
    this.origin = origin;
    this.externalOrigin = externalOrigin;
    this.apiBase = apiBase;

    this.loader = new DataLoader((paths) =>
      Promise.all(
        // Don't fail the entire batch on a single failed request.
        paths.map((path) =>
          this.request('GET', this._getUrl(path)).catch((e) => e),
        ),
      ),
    );
  }

  get<T = Obj>(path: string, args?: Args): Promise<Maybe<T>> {
    return this.loader.load(this.makePath(path, args));
  }

  protected validateConnectionaArgs({ first, after, last, before }: Args) {
    if (after && before) {
      throw new TypeError(
        '`after` and `before` cursors cannot be specified together',
      );
    }
    if (first != null && last != null) {
      throw new TypeError('`first` and `last` cannot be specified together.');
    }
    if (last != null && !before) {
      throw new TypeError(
        'Server does not support backwards pagination without a `before` cursor',
      );
    }
  }

  async getPaginatedConnection<T>(
    path: string,
    connectionsArgs: Args,
  ): Promise<Maybe<PaginationResult<T>>> {
    this.validateConnectionaArgs(connectionsArgs);
    const { after, first, before, last, ...args } = connectionsArgs;

    // assume forward pagination
    const limit = before ? last : first;

    const query: Args = { ...args, limit, pageSize: limit };

    if (before) query.before = before;
    if (after) query.cursor = after;
    if (limit) {
      query.limit = limit;
      query.pageSize = limit;
    }

    const items = await this.get<PaginatedApiResult<T>>(
      this.makePath(path, query),
    );

    if (!items) {
      return null;
    }

    invariant(
      items.meta,
      'Unexpected format. `GET` should return an array of items with a ' +
        '`meta` property containing an array of cursors and `hasNextPage`',
    );

    // hasNextPage is always relative to the direction we're paginating
    // i.e. it indicates if we can continue to paginating in this direction
    const { cursors, hasNextPage: hasNext, ...meta } = items.meta!;
    const lastIndex = items.length - 1;

    let hasPreviousPage: boolean, hasNextPage: boolean;

    if (before) {
      hasPreviousPage = !!hasNext;
      // this could be incorrect if we set before to the first item in the list
      // but Relay doesn't do that
      hasNextPage = true;
    } else {
      hasPreviousPage = !!after;
      hasNextPage = !!hasNext;
    }

    // let hasPreviousPage = !!after;
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
  ): Promise<Maybe<PaginationResult<T>>> {
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

  abstract request<T = any>(
    _method: HttpMethod,
    _reqUrl: string,
    _data?: Data,
  ): Promise<Maybe<T>>;

  post<T>(path: string, data?: Data) {
    return this.request<T>('POST', this._getUrl(path), data);
  }

  put<T>(path: string, data?: Data) {
    return this.request<T>('PUT', this._getUrl(path), data);
  }

  patch<T>(path: string, data?: Data) {
    return this.request<T>('PATCH', this._getUrl(path), data);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', this._getUrl(path));
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

  /**
   * Create a loader for batching requests based on the same query string parameter.
   * multiple calls to the loader will coalesce into one request with the query list
   * useful for filtering.
   *
   * ```ts
   * const createdByLoader = api.createArgLoader('/projects/', 'createdBy')
   * createLoader.load('1')
   * createLoader.load('2')
   *
   * // GET /projects?createdBy=1&createdBy=2
   * ```
   *
   * @param path A valid pathname not including the `apiBase`
   * @param key The query parameter to batch requests based on.
   */
  createArgLoader<T extends Record<string, unknown>>(
    path: string,
    key: string,
  ) {
    return this.createLoader<T>(
      (keys) => this.getUrl(path, { [key]: keys }),
      (item) => item[key] as string,
    );
  }

  /** Create a data loader that makes a chunked HTTP request */
  createLoader<T extends Record<string, unknown>>(
    getPath: (keys: string[]) => string,
    getKey: (obj: T) => string,
  ) {
    return new DataLoader<any, any>(async (keys) => {
      // No need to cache the GET; the DataLoader will cache it.
      const chunkedItems = await Promise.all(
        chunk<string>(keys, this.numKeysPerChunk || 1).map((chunkKeys) =>
          this.request<T[]>('GET', getPath(chunkKeys)),
        ),
      );

      const items = flatten<T | null | undefined>(chunkedItems).filter(
        <TItem>(
          item: TItem,
        ): item is TItem extends null | undefined ? never : TItem => !!item,
      );

      const itemsByKey: Record<string, T[]> = {};
      keys.forEach((key) => {
        itemsByKey[key] = [];
      });
      items.forEach((item) => {
        const key = getKey(item);
        if (itemsByKey[key]) {
          itemsByKey[key].push(item);
        }
      });

      return keys.map((key) => itemsByKey[key]);
    });
  }

  getUrl(path: string, args?: Args): string {
    return this._getUrl(this.makePath(path, args));
  }

  getExternalUrl(path: string, args?: Args): string {
    return this._getUrl(this.makePath(path, args), this.externalOrigin);
  }

  _getUrl(path: string, origin: string = this.origin) {
    return `${origin}${urlJoin(this.apiBase, path)}`;
  }
}
