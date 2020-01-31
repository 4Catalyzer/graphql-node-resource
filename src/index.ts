import { GraphQLString, graphqlSync, GraphQLFieldResolver } from 'graphql';
import fetch from './api/fetch';
import HttpApi from './api/HttpApi';
import HttpError from './api/HttpError';
import HttpResource from './resources/HttpResource';
import PaginatedHttpResource from './resources/PaginatedHttpResource';
import Resource from './resources/Resource';
import createNodeType from './types/NodeType';
import { Context, RESOURCE_CACHE_KEY } from './types/Context';
import asType from './utils/asType';
import resolveThunk from './utils/resolveThunk';
import translateKeys from './utils/translateKeys';
import urlJoin from './utils/urlJoin';
import { Model, IdModel } from './resources/Model';
import NodeType from './types/NodeTypeClass';

export const utils = {
  asType,
  resolveThunk,
  translateKeys,
  urlJoin,
};

export {
  createNodeType,
  fetch,
  HttpApi,
  HttpError,
  HttpResource,
  PaginatedHttpResource,
  Resource,
  RESOURCE_CACHE_KEY,
};

export { HttpMethod, RequestOptions } from './api/fetch';
export { Args, Data, PaginationResult, HttpApiOptions } from './api/HttpApi';

export { JsonApiError } from './api/HttpError';
export {
  Endpoint,
  HttpContext,
  HttpResourceOptions,
} from './resources/HttpResource';

export { CreateNodeTypeArgs } from './types/NodeType';

export { NodeFieldConfig, NodeTypeConfig } from './types/NodeTypeClass';

// =======

type MyContext = Context & {
  readonly httpApi: HttpApi;
};

const { NodeType } = createNodeType<MyContext>({
  localIdFieldMode: 'deprecated',
});

// function createResolve<TFields>(
//   resolve: GraphQLFieldResolver<Record<TFields, any>, TContext>,
//   fieldNames: Array<keyof TSource>,
// ) {
//   return function augmentedResolve(
//     obj: TSource,
//     args: TArgs,
//     context: TContext,
//     info: GraphQLResolveInfo,
//   ) {
//     for (const fieldName of fieldNames) {
//       if (obj[fieldName] === undefined) {
//         return asyncResolve(resolve, obj, args, context, info);
//       }
//     }

//     return resolve(obj, args, context, info);
//   };
// }

const Item = new NodeType({
  name: 'Item',

  fields: createResolve => ({
    foo: { type: GraphQLString },
    bar: {
      type: GraphQLString,
      resolve: createResolve(src => src.foo, ['foo']),
    },
    baz: {
      type: GraphQLString,
      resolve: src => src.id,
    },
  }),

  createResource: context => new HttpResource(context, { endpoint: '' }),
  model: new IdModel<{ foo: 1 }>(),
});
