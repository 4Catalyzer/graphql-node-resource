import HttpApi from './api/HttpApi';
import HttpError from './api/HttpError';
import fetch from './api/fetch';
import HttpResource from './resources/HttpResource';
import PaginatedHttpResource from './resources/PaginatedHttpResource';
import Resource from './resources/Resource';
import NodeType from './types/NodeType';
import createResolve from './types/createResolve';
import asType from './utils/asType';
import resolveThunk from './utils/resolveThunk';
import translateKeys from './utils/translateKeys';
import urlJoin from './utils/urlJoin';

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

export { RESOURCE_CACHE_KEY } from './types/Context';

export { setup } from './config';

export type { HttpMethod, RequestOptions } from './api/fetch';
export type {
  Args,
  Data,
  PaginationResult,
  HttpApiOptions,
} from './api/HttpApi';
export type { NodeTypeConfig } from './types/NodeType';

export type { JsonApiError } from './api/HttpError';
export type {
  Endpoint,
  HttpContext,
  HttpResourceOptions,
} from './resources/HttpResource';
