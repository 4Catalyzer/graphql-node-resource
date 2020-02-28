import { GraphQLFieldConfig, GraphQLInterfaceType } from 'graphql';
import { fromGlobalId, nodeDefinitions } from 'graphql-relay';
import invariant from 'invariant';

import Resource from './resources/Resource';
import { Context } from './types/Context';
// eslint-disable-next-line import/no-cycle
import NodeType from './types/NodeType';
import ResourceCache from './types/ResourceCache';

type Config = {
  nodeField: GraphQLFieldConfig<any, Context>;
  nodesField: GraphQLFieldConfig<any, Context>;
  localIdFieldMode: 'include' | 'omit' | 'deprecated';
  resourceManager: ResourceCache;
  nodeTypesByName: Map<string, NodeType<Resource<Context>, any>>;
  nodeInterface: GraphQLInterfaceType;
};

let config: Readonly<Config> | undefined;

function createConfig({
  localIdFieldMode = 'omit',
}: Pick<Config, 'localIdFieldMode'>): Config {
  const nodeTypesByName = new Map<string, NodeType<Resource<Context>, any>>();

  const { nodeInterface, nodeField, nodesField } = nodeDefinitions<Context>(
    async (globalId, context) => {
      const { type, id } = fromGlobalId(globalId);
      const resolvedType = nodeTypesByName.get(type);

      invariant(resolvedType, 'There is no matching type');
      const item = await resolvedType.getResource(context).get(id);

      if (!item) return null;

      return { $type: type, ...item };
    },

    obj => nodeTypesByName.get(obj.$type),
  );

  return {
    resourceManager: new ResourceCache(),
    nodeTypesByName,
    localIdFieldMode,
    nodeInterface,
    nodeField,
    nodesField,
  };
}

export function getConfig() {
  if (!config) {
    throw new Error('you must first call `setup`');
  }
  return config;
}

export function setup(options: Parameters<typeof createConfig>[0]) {
  if (config) {
    throw new Error("You can't call `setup` twice");
  }
  config = createConfig(options);
}
