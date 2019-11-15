/* eslint-disable no-underscore-dangle */

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

type Context = any;

type Args = Record<string, unknown>;

// graphql overrides

interface ObjStub {
  id: string;
}

interface ResourceConfig {
  [key: string]: unknown;
  endpoint?: Endpoint;
}

type NodeTypeConfig<
  TObject extends ObjStub,
  TContext,
  R extends Resource<TContext>
> = GraphQLObjectTypeConfig<TObject, TContext> & {
  localIdFieldName?: string | null | undefined;
  Resource: Class<R>;
  resourceConfig?: ResourceConfig;
};

export type NodeFieldResolver<
  TObject extends ObjStub,
  TContext
> = GraphQLFieldResolver<TObject, TContext>;

export type NodeFieldConfig<
  TObject extends ObjStub,
  TContext
> = GraphQLFieldConfig<TObject, TContext>;

export type NodeFieldConfigMap<
  TObject extends ObjStub,
  TContext
> = GraphQLFieldConfigMap<TObject, TContext>;

export type FieldNameResolver<
  TObject extends ObjStub,
  TContext,
  TArgs = Args
> = (
  fieldName: any,
  obj: TObject,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => any;

export interface CreateNodeTypeArgs<
  TObject extends ObjStub,
  TContext,
  TArgs = Args
> {
  fieldNameResolver?: FieldNameResolver<TObject, TContext, TArgs>;
  localIdFieldMode?: 'include' | 'omit' | 'deprecated';
  getDefaultResourceConfig?: (name: string) => unknown;
}

// Apollo Server shallowly clones the context for each request in a batch,
// making the context object inappropriate as a batch-level cache key. Use this
// to manually assign a cache key for the full batch.
export const RESOURCE_CACHE_KEY = Symbol('resource cache key');

export default function createNodeType<
  TObject extends ObjStub,
  TContext,
  TArgs = Args
>({
  fieldNameResolver = d => d,
  localIdFieldMode = 'omit',
  getDefaultResourceConfig = name => ({
    endpoint: pluralize(snakeCase(name)),
  }),
}: CreateNodeTypeArgs<TObject, TContext, TArgs> = {}) {
  // eslint-disable-next-line no-use-before-define
  const TYPES: Map<string, NodeType<any>> = new Map();

  const { nodeInterface, nodeField, nodesField } = nodeDefinitions<Context>(
    async (globalId, context) => {
      const { type, id } = fromGlobalId(globalId);
      const resolvesType = TYPES.get(type);

      invariant(resolvesType, 'There is no matching type');
      const item = await resolvesType!.getResource(context).get(id);

      if (!item) return null;

      return { $type: type, ...item };
    },
    obj => TYPES.get(obj.$type),
  );

  function getNodeResource(
    context: TContext,
    info: GraphQLResolveInfo,
  ): Resource<TContext> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const parentType = asType(info.parentType, NodeType);
    return parentType.getResource(context);
  }

  function getLocalId(
    obj: TObject,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const id = getNodeResource(context, info).makeId(obj);
    if (!id) throw new Error('null local id');

    return id;
  }

  function getNodeObject(
    obj: TObject,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const resource = getNodeResource(context, info);
    return resource.get<TObject>(resource.makeId(obj));
  }

  async function getAsyncNodeValue(
    obj: TObject,
    fieldName: keyof TObject,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const fullObj = await getNodeObject(obj, context, info);
    return fullObj && fullObj[fieldName];
  }

  function getNodeValue(
    obj: TObject,
    fieldName: keyof TObject,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    if (obj[fieldName] === undefined) {
      return getAsyncNodeValue(obj, fieldName, context, info);
    }

    return obj[fieldName];
  }

  async function asyncResolve(
    resolve: GraphQLFieldResolver<TObject, TContext, TArgs>,
    obj: TObject,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) {
    const fullObj = await getNodeObject(obj, context, info);
    return fullObj && resolve(fullObj, args, context, info);
  }

  function createResolve(
    resolve: GraphQLFieldResolver<TObject, TContext>,
    objFields: TObject,
  ): NodeFieldResolver<TObject, TContext> {
    const fieldNames = Object.keys(objFields) as Array<keyof TObject>;

    return function augmentedResolve(
      obj: TObject,
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
    obj: TObject,
    _args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => getLocalId(obj, context, info);

  const fieldResolve = (
    obj: TObject,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) =>
    getNodeValue(
      obj,
      fieldNameResolver(info.fieldName, obj, args, context, info),
      context,
      info,
    );

  function getLocalIdFieldName(
    name: string,
    localIdFieldName?: string | null | undefined,
  ) {
    if (localIdFieldName !== undefined) return localIdFieldName;

    return `${camelCase(name)}Id`;
  }

  function makeFields(
    fields: Thunk<Record<string, any>>,
    localIdFieldName?: string | null | undefined,
  ): () => GraphQLFieldConfigMap<ObjStub, Context> {
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
      Object.entries(augmentedFields).forEach(([fieldName, field]) => {
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

  const Resources: WeakMap<
    Context,
    Map<string, Resource<TContext>>
  > = new WeakMap();

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
    }: NodeTypeConfig<TObject, TContext, R>) {
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

    getResource(context: Context): R {
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
