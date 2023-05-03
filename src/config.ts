import { GraphQLFieldConfig, GraphQLInterfaceType } from 'graphql';
import {
  ConnectionConfig,
  fromGlobalId,
  nodeDefinitions,
} from 'graphql-relay';

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

/**
 * Returns the config created by calling `setup`. This can only be called after `setup` is called. This can be used
 * to add the `node` and `nodes` field to your Query type. These fields are required by the Relay client.w
 * 
 * @example
 * // Query.ts
 * // assumes you have already called setup previously
 * const config = getConfig();
 * 
 * export default new GraphQLObjectType({
 *   name: "Query",
 *   fields: () => ({
 *     node: config.nodeField,
 *     nodesField: config.nodesField
 *   })
 * })
 * @returns the previously created config
 */
export function getConfig() {
  if (!config) {
    throw new Error('you must first call `setup`');
  }
  return config;
}

/**
 * This is used by the Node class to determine how to generate the resulting GraphQL schema.
 * This must be called first by your application before trying to generate the GraphQL schema.
 * 
 * @param options a set of options to alter the behavior of this library
 * 
 * @returns the newly created config
 */
export function setup(options: Parameters<typeof createConfig>[0]): Config {
  if (config && process.env.NODE_ENV !== 'test') {
    throw new Error("You can't call `setup` twice");
  }
  config = createConfig(options);

  return config;
}
