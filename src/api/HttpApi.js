/* @flow */
/* eslint-disable no-underscore-dangle */

import url from 'url';
import DataLoader from 'dataloader';
import { connectionFromArray, forwardConnectionArgs } from 'graphql-relay';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import snakeCase from 'lodash/snakeCase';
import querystring from 'querystring';

import HttpError from './utils/HttpError';
import request from './utils/request';
import type { Data, Request } from './utils/request';

const PAGINATION_ARG_KEYS = Object.keys(forwardConnectionArgs);

export type Args = { [key: string]: mixed };
export type { Data };

export type ValidationResult = {
  valid: boolean,
  errors: ?Array<mixed>,
};

export type HttpApiOptions = {
  authorization?: string,
  getHeaders: Request => { [string]: string },
  apiBase: string,
  origin: string,
  externalOrigin: string,
};

export default class HttpApi {
  authorization: string;
  _getHeaders: Request => { [string]: string };
  _request: Request;
  _origin: string;
  _apiBase: string;
  _externalOrigin: string;
  _loader: DataLoader<*, *>;

  constructor(
    req: Request,
    {
      authorization,
      apiBase,
      getHeaders,
      origin,
      externalOrigin,
    }: HttpApiOptions,
  ) {
    this.authorization = authorization || '';

    this._getHeaders = getHeaders;
    this._origin = origin;
    this._externalOrigin = externalOrigin;
    this._apiBase = apiBase;

    this._loader = new DataLoader(paths =>
      Promise.all(
        paths.map(path =>
          // Don't fail the entire batch on a single failed request.
          this._get(path).catch(e => e),
        ),
      ),
    );
  }

  async get<T>(path: string, args?: Args): Promise<?T> {
    const item = await this._loader.load(this.makePath(path, args));
    if (item instanceof Error) {
      throw item;
    }

    return item;
  }

  async getPaginatedConnection(
    path: string,
    { after, first, ...args }: Args,
  ): Promise<mixed> {
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

    // XXX Remove items.links when all endpoints use modern pagination
    if (items.meta) {
      // new style pagination
      const { cursors, hasNextPage } = items.meta;

      // These connections only paginate forward, so the existence of a prev
      // page doesn't make any difference, but this is the correct value.
      const hasPreviousPage = !!after;

      return {
        edges: items.map((item, i) => ({
          node: item,
          cursor: cursors[i],
        })),
        pageInfo: {
          hasNextPage,
          endCursor: cursors[cursors.length - 1],
          hasPreviousPage,
        },
      };
    } else if (items.links) {
      // old style pagination
      const { links } = items;
      const u = links.next && url.parse(links.next, true);
      if (links.next && (!u || !u.query || !u.query.cursor)) {
        throw new Error(`invalid items.next format: ${u}`);
      }
      const endCursor = links.next && u.query.cursor;
      const edges = items.map(node => ({ node, cursor: '@@nil' }));
      if (endCursor) {
        edges[edges.length - 1].cursor = endCursor;
      }
      return {
        edges,
        pageInfo: {
          hasNextPage: !!endCursor,
          endCursor,
          hasPreviousPage: false, // only paginate forward
        },
      };
    }
    throw new Error('unexpected items format');
  }

  async getUnpaginatedConnection(path: string, args: Args): Promise<mixed> {
    const apiArgs = omit(args, PAGINATION_ARG_KEYS);
    const paginationArgs = pick(args, PAGINATION_ARG_KEYS);

    // XXX Need to cast the result of the get to a list
    const items = await this.get(this.makePath(path, apiArgs));
    if (!Array.isArray(items)) {
      throw new Error('Runtime Casting Exception');
    }
    return connectionFromArray(items, paginationArgs);
  }

  async getValidationResult(
    path: string,
    args: Args,
  ): Promise<ValidationResult> {
    try {
      await this.get(path, args);
    } catch (e) {
      if (e instanceof HttpError && (e.status === 422 || e.status === 409)) {
        return {
          valid: false,
          errors: e.errors,
        };
      }

      throw e;
    }

    return {
      valid: true,
      errors: null,
    };
  }

  async post(path: string, data?: Data): Promise<Object> {
    const item = await this._request('POST', path, data);
    if (!item) {
      throw new Error('POST returned no data');
    }

    return item;
  }

  put(path: string, data?: Data): Promise<?Object> {
    return this._request('PUT', path, data);
  }

  patch(path: string, data?: Data): Promise<?Object> {
    return this._request('PATCH', path, data);
  }

  delete(path: string): Promise<?Object> {
    return this._request('DELETE', path);
  }

  makePath(path: string, args?: Args): string {
    if (!args) {
      return path;
    }

    const [pathBase, searchBase] = path.split('?');
    const query = querystring.parse(searchBase);

    Object.entries(args).forEach(([key, value]) => {
      const translatedKey = snakeCase(key);

      if (value == null) {
        // Setting key to undefined is not sufficient with Node's querystring.
        delete query[translatedKey];
        return;
      }

      query[translatedKey] = Array.isArray(value) ? value.join(',') : value;
    });

    const search = querystring.stringify(query);
    if (!search) {
      return pathBase;
    }

    return `${pathBase}?${search}`;
  }

  createArgLoader(path: string, key: string) {
    return this.createLoader(
      keys => this.makePath(path, { [key]: keys }),
      item => item[key],
    );
  }

  createLoader<T>(
    getPath: (keys: string[]) => string,
    getKey: (obj: T) => string,
  ) {
    return new DataLoader(async keys => {
      // No need to cache the GET; the DataLoader will cache it.
      const items = await this._get(getPath((keys: any)));
      if (!items) {
        return [];
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

  getExternalSignedUrl = (path: string, args: Args) =>
    this._getUrl(this.makePath(path, args), true);

  getUrl = (path: string, args: Args): string =>
    this._getUrl(this.makePath(path, args), false);

  getExternalUrl = (path: string, args: Args): string =>
    this._getUrl(this.makePath(path, args), true);

  _get<T>(path: string): Promise<?T> {
    return this._request('GET', path);
  }

  _getUrl(path: string, external: boolean) {
    const origin = external ? this._externalOrigin : this._origin;
    return `${origin}${this._apiBase}${path}`;
  }

  _request<T>(method: string, path: string, data?: Data): Promise<?T> {
    return request({
      data,
      method,
      url: this._getUrl(path, false),
      request: this._request,
      authorization: this.authorization,
      getHeaders: this._getHeaders,
    });
  }
}
