import { GraphQLInterfaceType } from 'graphql';
import type { GraphQLFieldConfig } from 'graphql';
import { fromGlobalId, nodeDefinitions } from 'graphql-relay';
import type { ConnectionConfig } from 'graphql-relay';

import Resource from './resources/Resource.js';
import type { Context } from './types/Context.js';
// eslint-disable-next-line import/no-cycle
import NodeType from './types/NodeType.js';
import ResourceCache from './types/ResourceCache.js';

type Config = {
  nodeField: GraphQLFieldConfig<any, Context>;
  nodesField: GraphQLFieldConfig<any, Context>;
  localIdFieldMode: 'include' | 'omit' | 'deprecated';
  resourceManager: ResourceCache;
  nodeTypesByName: Map<string, NodeType<Resource<Context>, any>>;
  nodeInterface: GraphQLInterfaceType;

  connectionFields?: ConnectionConfig['connectionFields'];
  edgeFields?: ConnectionConfig['edgeFields'];
};

let config: Readonly<Config> | undefined;

function createConfig({
  localIdFieldMode = 'omit',
  ...rest
}: Pick<
  Config,
  'localIdFieldMode' | 'connectionFields' | 'edgeFields'
>): Config {
  const nodeTypesByName = new Map<string, NodeType<Resource<Context>, any>>();

  const { nodeInterface, nodeField, nodesField } = nodeDefinitions<Context>(
    async (globalId, context) => {
      const { type, id } = fromGlobalId(globalId);
      const resolvedType = nodeTypesByName.get(type);

      if (!resolvedType) {
        throw new Error('There is no matching type');
      }
      const resource = resolvedType.getResource(context);

      const item = !resolvedType.makeObjectStub
        ? await resource.get(id)
        : resolvedType.makeObjectStub(id);

      if (!item) return null;

      return { $type: type, ...item };
    },

    (obj) => obj.$type,
  );

  return {
    ...rest,
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
  if (config && process.env.NODE_ENV !== 'test') {
    throw new Error("You can't call `setup` twice");
  }
  config = createConfig(options);
}
