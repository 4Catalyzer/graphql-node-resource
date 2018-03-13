/* @flow */

import { GraphQLString, GraphQLBoolean, GraphQLFloat } from 'graphql';

import createNodeType, {
  NodeTypeBase,
  type NodeTypeConfig,
  type CreatedNodeType,
} from './types/NodeType';
import HttpResource, { type HttpContext } from './resources/HttpResource';
import Resource from './resources/Resource';

const {
  prepareConfig,
  registerNodeType,
  getResource,
}: CreatedNodeType<HttpContext> = createNodeType({});

type NTC<R> = NodeTypeConfig<HttpContext, R>;

class NodeType<R: Resource<HttpContext>> extends NodeTypeBase<HttpContext, R> {
  constructor(config: NTC<R>) {
    super(prepareConfig(config));
  }

  registerNodeType() {
    registerNodeType(this);
  }

  getResource(context: HttpContext) {
    return (getResource((this: NodeTypeBase<HttpContext, R>), context): any);
  }
}

class DeviceResource extends HttpResource {}

export const Device: NodeType<DeviceResource> = new NodeType({
  name: 'Device',

  fields: () => ({
    name: { type: GraphQLString, from: 'deviceName' },
  }),

  Resource: DeviceResource,
});

const dr = Device.getResource({ httpApi: (null: any) });
dr.get('asdf');
