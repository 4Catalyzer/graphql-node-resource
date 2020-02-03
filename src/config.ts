import { GraphQLFieldConfig, GraphQLInterfaceType } from 'graphql';
// eslint-disable-next-line max-classes-per-file
import { fromGlobalId, nodeDefinitions } from 'graphql-relay';
import invariant from 'invariant';

import Resource from './resources/Resource';
import { Context } from './types/Context';
// eslint-disable-next-line import/no-cycle
import NodeType from './types/NodeType';
import ResourceManager from './types/ResourceManager';

type Config = {
  nodeField: GraphQLFieldConfig<any, Context>;
  nodesField: GraphQLFieldConfig<any, Context>;
  localIdFieldMode: 'include' | 'omit' | 'deprecated';
  resourceManager: ResourceManager;
  typesManager: Map<string, NodeType<Resource<Context>, any>>;
  nodeInterface: GraphQLInterfaceType;
};

export const config: Readonly<Config> = {} as any;

function createConfig({
  localIdFieldMode = 'omit',
}: Pick<Config, 'localIdFieldMode'>): Config {
  const typesManager = new Map<string, NodeType<Resource<Context>, any>>();

  const { nodeInterface, nodeField, nodesField } = nodeDefinitions<Context>(
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

  return {
    resourceManager: new ResourceManager(),
    typesManager,
    localIdFieldMode,
    nodeInterface,
    nodeField,
    nodesField,
  };
}

export function needsSetup() {
  return Object.keys(config).length === 0;
}

export function setup(options: Parameters<typeof createConfig>[0]) {
  Object.assign(config, createConfig(options));
}
