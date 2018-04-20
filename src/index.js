/* @flow */

import HttpResource from './resources/HttpResource';
import PaginatedHttpResource from './resources/PaginatedHttpResource';
import Resource from './resources/Resource';

import HttpApi from './api/HttpApi';
import HttpError from './api/HttpError';
import fetch from './api/fetch';

import createNodeType from './types/NodeType';

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
  HttpApi,
  HttpError,
  fetch,
  HttpResource,
  PaginatedHttpResource,
  Resource,
  createNodeType,
};

export type { HttpMethod, RequestOptions } from './api/fetch';
export type {
  Args,
  Data,
  QueryString,
  ValidationResult,
  PaginationResult,
  HttpApiOptions,
} from './api/HttpApi';

export type { JsonApiError } from './api/HttpError';
export type {
  Endpoint,
  HttpContext,
  HttpResourceOptions,
} from './resources/HttpResource';

export {
  NodeFieldResolver,
  NodeFieldConfig,
  NodeFieldConfigMap,
  CreateNodeTypeArgs,
} from './types/NodeType';
