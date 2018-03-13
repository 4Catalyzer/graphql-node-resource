/* @flow */

import { GraphQLString, GraphQLBoolean, GraphQLFloat } from 'graphql';

import createNodeType, { type CreatedNodeType } from './types/NodeType';
import HttpResource, { type HttpContext } from './resources/HttpResource';

const { createNodeType: cnt }: CreatedNodeType<HttpContext> = createNodeType(
  {},
);

class DeviceResource extends HttpResource {}

export const Device = cnt({
  name: 'Device',

  fields: () => ({
    name: { type: GraphQLString, from: 'deviceName' },
  }),

  Resource: DeviceResource,
});

const dr = Device.getResource({ httpApi: (null: any) });
dr.geAsdft('asdf');
