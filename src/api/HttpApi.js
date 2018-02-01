/* @flow */
/* eslint-disable no-underscore-dangle */

import DataLoader from 'dataloader';
import { connectionFromArray, forwardConnectionArgs } from 'graphql-relay';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import snakeCase from 'lodash/snakeCase';
import querystring from 'querystring';

import HttpError from './HttpError';
import request from './request';
import translateKeys from './translateKeys';
import type { Data, Request } from './request';

const PAGINATION_ARG_KEYS = Object.keys(forwardConnectionArgs);

export type Args = { [key: string]: mixed };
export type { Data };

export type ValidationResult = {
  valid: boolean,
  errors: ?Array<mixed>,
};

export type HttpApiOptions = {
  authorization?: string,
  apiBase: string,
  origin: string,
  externalOrigin: string,
};

export default class HttpApi {
  authorization: string;
  request: Request;

  _origin: string;
  _apiBase: string;
  _externalOrigin: string;
  _loader: DataLoader<*, *>;

  serializeKey = snakeCase;

  constructor(
    req: Request,
    { authorization, apiBase, origin, externalOrigin }: HttpApiOptions,
  ) {
    this.authorization = authorization || '';
    this.request = req;

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

  getResponseData({ data, meta }: { data?: mixed, meta?: mixed }) {
    const translatedData: any = data;
    if (meta) translatedData.meta = meta;
    return translatedData;
  }

  getHeaders() {
    return {
      Authorization: this.authorization,
    };
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

    if (items.meta) {
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

  async fetch<T>(method: string, path: string, data?: Data): Promise<?T> {
    const json = await request({
      method,
      url: this._getUrl(path, false),
      headers: this.getHeaders(),
      data: (translateKeys(data, this.serializeKey): any),
      files: this.request.files.map(({ fieldname, ...file }) => ({
        ...file,
        fieldname: this.serializeKey(fieldname),
      })),
    });

    return this.getResponseData(json);
  }

  post(path: string, data?: Data): Promise<?Object> {
    return this.fetch('POST', path, data);
  }

  put(path: string, data?: Data): Promise<?Object> {
    return this.fetch('PUT', path, data);
  }

  patch(path: string, data?: Data): Promise<?Object> {
    return this.fetch('PATCH', path, data);
  }

  delete(path: string): Promise<?Object> {
    return this.fetch('DELETE', path);
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
    return this.fetch('GET', path);
  }

  _getUrl(path: string, external: boolean) {
    const origin = external ? this._externalOrigin : this._origin;
    return `${origin}${this._apiBase}${path}`;
  }
}
