/* @flow */
/* eslint-disable no-underscore-dangle */

import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
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
import kebabCase from 'lodash/kebabCase';
import pluralize from 'pluralize';
import invariant from 'invariant';

import asType from '../utils/asType';
import type HttpApi from '../api/HttpApi';
import resolveThunk from '../utils/resolveThunk';
import Resource from '../resources/Resource';
import HttpResource from '../resources/HttpResource';

export type Context = {
  httpApi: HttpApi,
};

// graphql overrides

type ObjStub = {
  id: string,
};

type NodeTypeConfig<R: Resource> = GraphQLObjectTypeConfig<
  ObjStub,
  Context,
> & {
  localIdFieldName?: ?string,
  Resource: Class<R>,
  resourceConfig?: mixed,
};

export type NodeFieldResolver = GraphQLFieldResolver<ObjStub, Context>;
export type NodeFieldConfig = GraphQLFieldConfig<ObjStub, Context>;
export type NodeFieldConfigMap = GraphQLFieldConfigMap<ObjStub, Context>;

type FieldNameResolver = (
  fieldName: string,
  obj: ObjStub,
  args: mixed,
  context: Context,
  info: GraphQLResolveInfo,
) => string;

type CreateNodeTypeArgs = {
  fieldNameResolver?: FieldNameResolver,
};

export default function createNodeType({
  fieldNameResolver = d => d,
}: CreateNodeTypeArgs) {
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
  ): HttpResource {
    const parentType = asType(info.parentType, NodeType); // eslint-disable-line no-use-before-define
    return parentType.getResource(context);
  }

  function getLocalId(obj, context: Context, info: GraphQLResolveInfo) {
    const id = getNodeResource(context, info).makeId(obj);
    if (!id) throw new Error('null local id');

    return id;
  }

  async function getNodeValue(
    obj: ObjStub,
    fieldName: string,
    context: Context,
    info: GraphQLResolveInfo,
  ) {
    if (obj[fieldName] !== undefined) {
      return obj[fieldName];
    }

    const resource = getNodeResource(context, info);
    const fullObj = await resource.get(resource.makeId(obj));
    return fullObj && (fullObj: { [key: string]: mixed })[fieldName];
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

      if (localIdFieldName) {
        idFields[localIdFieldName] = {
          type: new GraphQLNonNull(GraphQLString),
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

  function getDefaultResourceConfig(name) {
    return {
      endpoint: pluralize(kebabCase(name)),
    };
  }

  const Resources: WeakMap<Context, Map<string, Resource>> = new WeakMap();

  class NodeType<R: Resource> extends GraphQLObjectType {
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
      // eslint-disable-next-line no-param-reassign
      localIdFieldName = getLocalIdFieldName(name, localIdFieldName);

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
    nodeField,
    nodesField,

    createResolve<K: {}>(
      resolve: GraphQLFieldResolver<
        ObjStub & $ObjMap<K, <V>(Class<V>) => ?V>,
        Context,
      >,
      objFields: K,
    ): NodeFieldResolver {
      const objKeys = Object.keys(objFields);

      return async function augmentedResolve(obj, args, context, info) {
        const augmentedObj = { ...obj };

        const objValues = await Promise.all(
          objKeys.map(objKey => getNodeValue(obj, objKey, context, info)),
        );
        objKeys.forEach((objKey, i) => {
          augmentedObj[objKey] = objValues[i];
        });

        return resolve(augmentedObj, args, context, info);
      };
    },
  };
}
