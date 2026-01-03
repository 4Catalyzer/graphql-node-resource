import HttpApi from './api/HttpApi.js';
import HttpError from './api/HttpError.js';
import fetch from './api/fetch.js';
import HttpResource from './resources/HttpResource.js';
import PaginatedHttpResource from './resources/PaginatedHttpResource.js';
import Resource from './resources/Resource.js';
import NodeType from './types/NodeType.js';
import createResolve from './types/createResolve.js';
import asType from './utils/asType.js';
import resolveThunk from './utils/resolveThunk.js';
import translateKeys from './utils/translateKeys.js';
import urlJoin from './utils/urlJoin.js';

export const utils = {
  asType,
  resolveThunk,
  translateKeys,
  urlJoin,
};

export {
  createResolve,
  fetch,
  HttpApi,
  HttpError,
  HttpResource,
  NodeType,
  PaginatedHttpResource,
  Resource,
};

export { RESOURCE_CACHE_KEY } from './types/Context.js';

export { setup } from './config.js';

export type { HttpMethod, RequestOptions } from './api/fetch.js';
export type {
  Args,
  Data,
  PaginationResult,
  HttpApiOptions,
} from './api/HttpApi.js';
export type { NodeTypeConfig } from './types/NodeType.js';

export type { JsonApiError } from './api/HttpError.js';
export type {
  Endpoint,
  HttpContext,
  HttpResourceOptions,
} from './resources/HttpResource.js';
