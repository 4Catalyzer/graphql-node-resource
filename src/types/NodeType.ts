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

import Resource from '../resources/Resource';
import asType from '../utils/asType';
import resolveThunk from '../utils/resolveThunk';

type Context = any;

// graphql overrides

interface ObjStub {
  [fieldname: string]: unknown;
  id: string;
}

type NodeTypeConfig<R extends Resource<any>> = GraphQLObjectTypeConfig<
  ObjStub,
  Context
> & {
  localIdFieldName?: string | null | undefined;
  Resource: Class<R>;
  resourceConfig?: unknown;
};

export type NodeFieldResolver<TContext> = GraphQLFieldResolver<
  ObjStub,
  TContext
>;
export type NodeFieldConfig<TContext> = GraphQLFieldConfig<ObjStub, TContext>;
export type NodeFieldConfigMap<TContext> = GraphQLFieldConfigMap<
  ObjStub,
  TContext
>;

export type FieldNameResolver<TContext> = (
  fieldName: string,
  obj: ObjStub,
  args: unknown,
  context: TContext,
  info: GraphQLResolveInfo,
) => string;

export type CreateNodeTypeArgs = {
  fieldNameResolver?: FieldNameResolver<any>;
  localIdFieldMode?: 'include' | 'omit' | 'deprecated';
  getDefaultResourceConfig?: (name: string) => unknown;
};

// Apollo Server shallowly clones the context for each request in a batch,
// making the context object inappropriate as a batch-level cache key. Use this
// to manually assign a cache key for the full batch.
export const RESOURCE_CACHE_KEY = Symbol('resource cache key');

export default function createNodeType({
  fieldNameResolver = d => d,
  localIdFieldMode = 'omit',
  getDefaultResourceConfig = name => ({
    endpoint: pluralize(snakeCase(name)),
  }),
}: CreateNodeTypeArgs = {}) {
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
    context: Context,
    info: GraphQLResolveInfo,
  ): Resource<any> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const parentType = asType(info.parentType, NodeType);
    return parentType.getResource(context);
  }

  function getLocalId(
    obj: ObjStub,
    context: Context,
    info: GraphQLResolveInfo,
  ) {
    const id = getNodeResource(context, info).makeId(obj);
    if (!id) throw new Error('null local id');

    return id;
  }

  function getNodeObject(
    obj: ObjStub,
    context: Context,
    info: GraphQLResolveInfo,
  ) {
    const resource = getNodeResource(context, info);
    return resource.get(resource.makeId(obj));
  }

  async function getAsyncNodeValue(
    obj: ObjStub,
    fieldName: string,
    context: Context,
    info: GraphQLResolveInfo,
  ) {
    const fullObj = await getNodeObject(obj, context, info);
    return (
      fullObj &&
      (fullObj as {
        [key: string]: unknown;
      })[fieldName]
    );
  }

  function getNodeValue(
    obj: ObjStub,
    fieldName: string,
    context: Context,
    info: GraphQLResolveInfo,
  ) {
    if (obj[fieldName] === undefined) {
      return getAsyncNodeValue(obj, fieldName, context, info);
    }

    return obj[fieldName];
  }

  async function asyncResolve(
    resolve: GraphQLFieldResolver<any, any>,
    obj: ObjStub,
    args: Record<string, string>,
    context: Context,
    info: GraphQLResolveInfo,
  ) {
    const fullObj = await getNodeObject(obj, context, info);
    return fullObj && resolve(fullObj, args, context, info);
  }

  function createResolve<K extends ObjStub>(
    resolve: GraphQLFieldResolver<ObjStub, Context>,
    objFields: K,
  ): NodeFieldResolver<Context> {
    const fieldNames = Object.keys(objFields);

    return function augmentedResolve(obj, args, context, info) {
      for (const fieldName of fieldNames) {
        if (obj[fieldName] === undefined) {
          return asyncResolve(resolve, obj, args, context, info);
        }
      }

      return resolve(obj, args, context, info);
    };
  }

  const resolveLocalId = (
    obj: ObjStub,
    _args: Record<string, string>,
    context: Context,
    info: GraphQLResolveInfo,
  ) => getLocalId(obj, context, info);

  const fieldResolve = (
    obj: ObjStub,
    args: unknown,
    context: Context,
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

      Object.keys(augmentedFields).forEach(fieldName => {
        // TODO: Find a Flow-friendly Object.entries pattern.
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

  const Resources: WeakMap<
    Context,
    Map<string, Resource<any>>
  > = new WeakMap();

  class NodeType<R extends Resource<any>> extends GraphQLObjectType
    implements NodeType<R> {
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
    }: NodeTypeConfig<R>) {
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
