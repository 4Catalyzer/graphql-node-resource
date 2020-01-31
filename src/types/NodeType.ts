// eslint-disable-next-line max-classes-per-file
import { GraphQLFieldConfig, GraphQLResolveInfo } from 'graphql';
import { fromGlobalId, nodeDefinitions } from 'graphql-relay';
import invariant from 'invariant';

import Resource from '../resources/Resource';
import asType from '../utils/asType';
import NodeTypeBase, { NodeTypeConfig } from './NodeTypeClass';
import { Model } from '../resources/Model';
import ResourceManager from './ResourceManager';
import { Context } from './Context';

export interface ObjStub {
  id: string;
}

export interface Args {
  [argName: string]: any;
}

export interface CreateNodeTypeArgs {
  localIdFieldMode?: 'include' | 'omit' | 'deprecated';
}

interface NodeTypeDefinitions<TContext extends Context> {
  NodeType: new <R extends Resource<TContext>, TSource>(
    config: Omit<
      NodeTypeConfig<R, Model<TSource>>,
      'localIdFieldMode' | 'resourceManager' | 'typesManager' | 'nodeInterface'
    >,
  ) => NodeTypeBase<R, TSource>;
  nodeField: GraphQLFieldConfig<any, Context>;
  nodesField: GraphQLFieldConfig<any, Context>;
  getNodeResource: (context: Context, info: GraphQLResolveInfo) => Resource;
}

function createNodeType<TContext extends Context = Context>({
  localIdFieldMode = 'omit',
}: CreateNodeTypeArgs): NodeTypeDefinitions<TContext> {
  const resourceManager = new ResourceManager();
  const typesManager = new Map<string, NodeTypeBase<Resource<Context>, any>>();

  const { nodeInterface, nodeField, nodesField } = nodeDefinitions<TContext>(
    async (globalId, context) => {
      const { type, id } = fromGlobalId(globalId);
      const resolvesType = typesManager.get(type);

      invariant(resolvesType, 'There is no matching type');
      const item = await resolvesType.getResource(context).get(id);

      if (!item) return null;

      return { $type: type, ...item };
    },

    obj => typesManager.get(obj.$type),
  );

  function getNodeResource(context: TContext, info: GraphQLResolveInfo) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const parentType = asType(info.parentType, NodeType);
    return parentType.getResource(context);
  }

  class NodeType<R extends Resource<Context>, TSource> extends NodeTypeBase<
    R,
    TSource
  > {
    constructor(
      config: Omit<
        NodeTypeConfig<R, Model<TSource>>,
        | 'localIdFieldMode'
        | 'resourceManager'
        | 'typesManager'
        | 'nodeInterface'
      >,
    ) {
      super({
        ...config,
        localIdFieldMode,
        resourceManager,
        typesManager,
        nodeInterface,
      });
    }
  }

  return {
    NodeType,
    nodeField,
    nodesField,
    getNodeResource,
  };
}

export default createNodeType;
