// eslint-disable-next-line max-classes-per-file
import {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLFieldResolver,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLResolveInfo,
  GraphQLString,
  Thunk,
} from 'graphql';
import {
  connectionDefinitions,
  fromGlobalId,
  globalIdField,
  nodeDefinitions,
} from 'graphql-relay';
import invariant from 'invariant';
import camelCase from 'lodash/camelCase';
import snakeCase from 'lodash/snakeCase';
import pluralize from 'pluralize';
import { Class } from 'utility-types';

import { Endpoint } from '../resources/HttpResource';
import Resource from '../resources/Resource';
import asType from '../utils/asType';
import resolveThunk from '../utils/resolveThunk';

// Apollo Server shallowly clones the context for each request in a batch,
// making the context object inappropriate as a batch-level cache key. Use this
// to manually assign a cache key for the full batch.
export const RESOURCE_CACHE_KEY = Symbol('resource cache key');

export interface Context {
  [RESOURCE_CACHE_KEY]: any;
}

export interface Source {
  id: string;
}

export type NodeFieldResolver<
  TSource extends Source,
  TContext
> = GraphQLFieldResolver<TSource, TContext>;

export type NodeFieldConfig<
  TSource extends Source,
  TContext
> = GraphQLFieldConfig<TSource, TContext>;

export type NodeFieldConfigMap<
  TSource extends Source,
  TContext
> = GraphQLFieldConfigMap<TSource, TContext>;

export interface CreateNodeTypeArgs {
  localIdFieldMode?: 'include' | 'omit' | 'deprecated';
  getDefaultResourceConfig?: (name: string) => unknown;
}

export interface NodeTypeInterface<
  TContext extends Context,
  R extends Resource<TContext>
> extends GraphQLObjectType {
  getResource(context: TContext): R;
}

function createNodeType<
  TSource extends Source,
  TContext extends Context,
  TArgs = { [key: string]: any }
>({
  localIdFieldMode = 'omit',
  getDefaultResourceConfig = name => ({
    endpoint: pluralize(snakeCase(name)),
  }),
}: CreateNodeTypeArgs): {
  getNodeValue: (
    obj: TSource,
    fieldName: keyof TSource,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => Promise<any> | TSource[keyof TSource];
  nodeField: GraphQLFieldConfig<TSource, TContext, TArgs>;
  nodesField: GraphQLFieldConfig<TSource, TContext, TArgs>;
  getNodeResource: (
    context: TContext,
    info: GraphQLResolveInfo,
  ) => Resource<TContext>;
  NodeType: Class<NodeTypeInterface<TContext, Resource<TContext>>>;
  createResolve: (
    resolve: GraphQLFieldResolver<TSource, TContext>,
    fieldNames: Array<keyof TSource>,
  ) => (
    obj: TSource,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => Promise<any>;
} {
  const TYPES = new Map();

  const { nodeInterface, nodeField, nodesField } = nodeDefinitions<TContext>(
    async (globalId, context) => {
      const { type, id } = fromGlobalId(globalId);
      const resolvesType = TYPES.get(type);

      invariant(resolvesType, 'There is no matching type');
      const item = await resolvesType.getResource(context).get(id);

      if (!item) return null;

      return { $type: type, ...item };
    },

    obj => TYPES.get(obj.$type),
  );

  function getNodeResource(context: TContext, info: GraphQLResolveInfo) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const parentType = asType(info.parentType, NodeType);
    return parentType.getResource(context);
  }

  function getLocalId(
    obj: TSource,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const id = getNodeResource(context, info).makeId(obj);
    if (!id) throw new Error('null local id');

    return id;
  }

  function getNodeObject(
    obj: TSource,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const resource = getNodeResource(context, info);
    return resource.get<TSource>(resource.makeId(obj));
  }

  async function getAsyncNodeValue(
    obj: TSource,
    fieldName: keyof TSource,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const fullObj = await getNodeObject(obj, context, info);
    return fullObj && fullObj[fieldName];
  }

  function getNodeValue(
    obj: TSource,
    fieldName: keyof TSource,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    if (obj[fieldName] === undefined) {
      return getAsyncNodeValue(obj, fieldName, context, info);
    }

    return obj[fieldName];
  }

  async function asyncResolve(
    resolve: GraphQLFieldResolver<TSource, TContext>,
    obj: TSource,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const fullObj = await getNodeObject(obj, context, info);
    return fullObj && resolve(fullObj, args, context, info);
  }

  function createResolve(
    resolve: GraphQLFieldResolver<TSource, TContext>,
    fieldNames: Array<keyof TSource>,
  ) {
    return function augmentedResolve(
      obj: TSource,
      args: TArgs,
      context: TContext,
      info: GraphQLResolveInfo,
    ) {
      for (const fieldName of fieldNames) {
        if (obj[fieldName] === undefined) {
          return asyncResolve(resolve, obj, args, context, info);
        }
      }

      return resolve(obj, args, context, info);
    };
  }

  const resolveLocalId = (
    obj: TSource,
    _args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => getLocalId(obj, context, info);

  const fieldResolve = (
    obj: TSource,
    _args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => getNodeValue(obj, info.fieldName as keyof TSource, context, info);

  function getLocalIdFieldName(
    name: string,
    localIdFieldName?: string | null,
  ) {
    if (localIdFieldName !== undefined) return localIdFieldName;

    return `${camelCase(name)}Id`;
  }

  function makeFields(
    fields: Thunk<Record<string, any>>,
    localIdFieldName?: string | null,
  ): Thunk<GraphQLFieldConfigMap<TSource, TContext>> {
    return () => {
      const idFields: Record<string, unknown> = {
        id: globalIdField(undefined, getLocalId),
      };

      // This will only be set if localIdFieldMode is not 'omit'.
      if (localIdFieldName) {
        idFields[localIdFieldName] = {
          type: GraphQLString,
          deprecationReason:
            localIdFieldMode === 'deprecated'
              ? 'local IDs are deprecated; use "handle" if available or "id" for the global ID'
              : null,
          resolve: resolveLocalId,
        };
      }

      const augmentedFields = resolveThunk(fields);

      Object.keys(augmentedFields).forEach(fieldName => {
        const field = augmentedFields[fieldName];

        if (field.resolve) {
          return;
        }

        augmentedFields[fieldName] = {
          ...field,
          resolve: fieldResolve,
        };
      });

      return {
        ...idFields,
        ...augmentedFields,
      };
    };
  }

  const Resources = new WeakMap();

  class NodeType<R extends Resource<TContext>> extends GraphQLObjectType {
    Connection: GraphQLObjectType;

    Edge: GraphQLObjectType;

    localIdFieldName: string | null | undefined;

    resourceConfig: unknown;

    NodeResource: Class<R>;

    constructor({
      name,
      interfaces,
      localIdFieldName,
      fields,
      Resource: NodeResource,
      resourceConfig,
      ...config
    }: GraphQLObjectTypeConfig<TSource, TContext> & {
      localIdFieldName?: string | null | undefined;
      Resource: Class<R>;
      resourceConfig?: {
        [key: string]: unknown;
        endpoint?: Endpoint;
      };
    }) {
      if (localIdFieldMode !== 'omit') {
        // eslint-disable-next-line no-param-reassign
        localIdFieldName = getLocalIdFieldName(name, localIdFieldName);
      } else {
        invariant(
          !localIdFieldName,
          "must not specify localIdFieldName when localIdFieldMode is 'omit'",
        );
      }

      super({
        ...config,
        name,
        interfaces: () => [...(resolveThunk(interfaces) || []), nodeInterface],
        fields: makeFields(fields, localIdFieldName),
      });

      const { connectionType, edgeType } = connectionDefinitions({
        nodeType: this,
      });

      this.Connection = connectionType;
      this.Edge = edgeType;

      this.localIdFieldName = localIdFieldName;
      this.NodeResource = NodeResource;
      this.resourceConfig = resourceConfig || getDefaultResourceConfig(name);

      TYPES.set(name, this);
    }

    getResource(context: TContext) {
      const cacheKey = context[RESOURCE_CACHE_KEY] || context;
      let resources = Resources.get(cacheKey);

      if (!resources) {
        // eslint-disable-next-line no-param-reassign
        resources = new Map();
        Resources.set(cacheKey, resources);
      }

      let resource = resources.get(this.name);
      if (!resource) {
        resource = new this.NodeResource(context, this.resourceConfig);
        resources.set(this.name, resource);
      }

      return asType(resource, this.NodeResource);
    }
  }

  return {
    NodeType,
    getNodeResource,
    getNodeValue,
    nodeField,
    nodesField,
    createResolve,
  };
}

export default createNodeType;
