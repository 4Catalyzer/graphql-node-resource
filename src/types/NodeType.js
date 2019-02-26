/* @flow */
/* eslint-disable no-underscore-dangle */

import { GraphQLObjectType, GraphQLString } from 'graphql';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLFieldResolver,
  GraphQLObjectTypeConfig,
  GraphQLResolveInfo,
} from 'graphql';
import {
  connectionDefinitions,
  fromGlobalId,
  globalIdField,
  nodeDefinitions,
} from 'graphql-relay';
import camelCase from 'lodash/camelCase';
import snakeCase from 'lodash/snakeCase';
import pluralize from 'pluralize';
import invariant from 'invariant';

import asType from '../utils/asType';
import resolveThunk from '../utils/resolveThunk';
import Resource from '../resources/Resource';

type Context = any;

// graphql overrides

type ObjStub = {
  id: string,
};

type NodeTypeConfig<R: Resource<*>> = {|
  ...GraphQLObjectTypeConfig<ObjStub, Context>,
  localIdFieldName?: ?string,
  Resource: Class<R>,
  resourceConfig?: mixed,
|};

export type NodeFieldResolver<TContext> = GraphQLFieldResolver<
  ObjStub,
  TContext,
>;
export type NodeFieldConfig<TContext> = GraphQLFieldConfig<ObjStub, TContext>;
export type NodeFieldConfigMap<TContext> = GraphQLFieldConfigMap<
  ObjStub,
  TContext,
>;

export type FieldNameResolver<TContext> = (
  fieldName: string,
  obj: ObjStub,
  args: mixed,
  context: TContext,
  info: GraphQLResolveInfo,
) => string;

export type CreateNodeTypeArgs = {
  fieldNameResolver?: FieldNameResolver<*>,
  localIdFieldMode: 'include' | 'omit' | 'deprecated',
  getDefaultResourceConfig?: (name: string) => mixed,
};

export default function createNodeType({
  fieldNameResolver = d => d,
  localIdFieldMode = 'omit',
  getDefaultResourceConfig = name => ({
    endpoint: pluralize(snakeCase(name)),
  }),
}: CreateNodeTypeArgs = {}) {
  // eslint-disable-next-line no-use-before-define
  const TYPES: Map<string, NodeType<any>> = new Map();

  const { nodeInterface, nodeField, nodesField } = nodeDefinitions(
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

  function getNodeResource(
    context: Context,
    info: GraphQLResolveInfo,
  ): Resource<*> {
    // eslint-disable-next-line no-use-before-define
    const parentType = asType(info.parentType, NodeType);
    return parentType.getResource(context);
  }

  function getLocalId(obj, context: Context, info: GraphQLResolveInfo) {
    const id = getNodeResource(context, info).makeId(obj);
    if (!id) throw new Error('null local id');

    return id;
  }

  function getNodeObject(obj, context, info) {
    const resource = getNodeResource(context, info);
    return resource.get(resource.makeId(obj));
  }

  async function getAsyncNodeValue(obj, fieldName, context, info) {
    const fullObj = await getNodeObject(obj, context, info);
    return fullObj && (fullObj: { [key: string]: mixed })[fieldName];
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

  async function asyncResolve(resolve, obj, args, context, info) {
    const fullObj = await getNodeObject(obj, context, info);
    return fullObj && resolve(fullObj, args, context, info);
  }

  function createResolve<K: {}>(
    resolve: GraphQLFieldResolver<
      ObjStub & $ObjMap<K, <V>(Class<V>) => ?V>,
      Context,
    >,
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

  const resolveLocalId = (obj, args, context, info) =>
    getLocalId(obj, context, info);

  const fieldResolve = (
    obj: ObjStub,
    args: mixed,
    context: Context,
    info: GraphQLResolveInfo,
  ) =>
    getNodeValue(
      obj,
      fieldNameResolver(info.fieldName, obj, args, context, info),
      context,
      info,
    );

  function getLocalIdFieldName(name, localIdFieldName) {
    if (localIdFieldName !== undefined) return localIdFieldName;

    return `${camelCase(name)}Id`;
  }

  function makeFields(
    fields,
    localIdFieldName,
  ): () => GraphQLFieldConfigMap<ObjStub, Context> {
    return () => {
      const idFields = {
        id: globalIdField(null, getLocalId),
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

  const Resources: WeakMap<Context, Map<string, Resource<*>>> = new WeakMap();

  class NodeType<R: Resource<*>> extends GraphQLObjectType {
    Connection: GraphQLObjectType;
    Edge: GraphQLObjectType;

    localIdFieldName: ?string;
    resourceConfig: mixed;
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
      let resources = Resources.get(context);
      if (!resources) {
        // eslint-disable-next-line no-param-reassign
        resources = new Map();
        Resources.set(context, resources);
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
