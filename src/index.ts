import fetch from './api/fetch';
import HttpApi from './api/HttpApi';
import HttpError from './api/HttpError';
import HttpResource from './resources/HttpResource';
import PaginatedHttpResource from './resources/PaginatedHttpResource';
import Resource from './resources/Resource';
import createResolve from './types/createResolve';
import NodeType from './types/NodeType';
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

export { HttpMethod, RequestOptions } from './api/fetch';
export { Args, Data, PaginationResult, HttpApiOptions } from './api/HttpApi';
export { NodeTypeConfig } from './types/NodeType';

export { JsonApiError } from './api/HttpError';
export {
  Endpoint,
  HttpContext,
  HttpResourceOptions,
} from './resources/HttpResource';
