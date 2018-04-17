/* @flow */

import { GraphQLString } from 'graphql';
import mockedFetch from 'node-fetch';

import createNodeType from '../src/types/NodeType';
import HttpResource from '../src/resources/HttpResource';
import type { MockContext } from './helpers';

describe('NodeType', () => {
  let NodeType;
  let createResolve;

  beforeEach(() => {
    ({ NodeType, createResolve } = createNodeType());
  });

  afterEach(() => {
    mockedFetch.restore();
  });

  it('should createNode', async () => {
    const type = new NodeType({
      name: 'Foo',
      fields: () => ({
        foo: {
          type: GraphQLString,
          resolve: createResolve(
            async (obj, args, context: MockContext) => {
              await context.httpApi.get('foo');
              return { foo: obj.foo };
            },
            { foo: String },
          ),
        },
      }),
      Resource: HttpResource,
      resourceConfig: {
        endpoint: 'foo/bar',
      },
    });

    expect(type.name).toEqual('Foo');
  });
});
