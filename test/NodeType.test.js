/* @flow */

import {
  graphql,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLObjectType,
} from 'graphql';
import mockedFetch from 'node-fetch';

import { createNodeType, HttpResource } from '../src';
import { TestHttpApi, TestHttpResource, type MockContext } from './helpers';

describe('NodeType', () => {
  const nodeId = Buffer.from('Widget:1').toString('base64');

  let schema;
  let context;
  let NodeType;
  let createResolve;

  async function runQuery(source, variableValues) {
    const result = await graphql({
      schema,
      source,
      variableValues,
      contextValue: context,
    });
    if (result.errors) throw result.errors[0];
    return result.data || {};
  }

  function mockResponses() {
    mockedFetch.get('https://gateway/v1/widgets/1', {
      status: 200,
      body: {
        data: { id: '1', name: 'Floofh', number: 5, user: { id: '2' } },
      },
    });

    mockedFetch.get('https://gateway/v1/users/2', {
      status: 200,
      body: {
        data: { id: '2', name: 'Johan Schmidt', favoriteColor: 'blue' },
      },
    });
  }

  beforeEach(() => {
    context = {
      httpApi: new TestHttpApi(),
    };

    const { nodeField, nodesField, ...rest } = createNodeType({
      localIdFieldMode: 'deprecated',
    });
    ({ NodeType, createResolve } = rest);

    class WidgetResource extends TestHttpResource {
      getFoo() {
        return this.api.foo();
      }
    }

    const User = new NodeType({
      name: 'User',
      fields: () => ({
        name: { type: GraphQLString },
        resolvedFavoriteColor: {
          type: GraphQLString,
          resolve: createResolve(({ favoriteColor }) => favoriteColor, {
            favoriteColor: String,
          }),
        },
        resolvedUserId: {
          type: GraphQLString,
          resolve: createResolve(({ id }) => id, {
            id: String,
          }),
        },
      }),
      Resource: TestHttpResource,
      localIdFieldName: 'userId',
      resourceConfig: {
        endpoint: 'users',
      },
    });

    const Widget = new NodeType({
      name: 'Widget',
      fields: () => ({
        name: { type: GraphQLString },
        number: { type: GraphQLInt },
        foo: {
          type: GraphQLString,
          resolve: (obj, args, ctx) => Widget.getResource(ctx).getFoo(),
        },
        user: {
          type: User,
        },
      }),
      Resource: WidgetResource,
    });

    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          node: nodeField,
          nodes: nodesField,
          widget: { type: Widget },
        },
      }),
    });
  });

  afterEach(() => {
    mockedFetch.restore();
  });

  it('should fetch node', async () => {
    mockResponses();
    const result = await runQuery(
      `
        {
          node(id: "${nodeId}") {
            ...on Widget {
              name
            }
          }
        }
      `,
    );

    expect(result.node).toEqual({ name: 'Floofh' });
  });

  it('should add inferred local ids', async () => {
    mockResponses();
    const result = await runQuery(
      `
        {
          node(id: "${nodeId}") {
            ...on Widget {
              widgetId
            }
          }
        }
      `,
    );

    expect(result.node).toEqual({ widgetId: '1' });
  });

  it('should resolve resource', async () => {
    mockResponses();
    const result = await runQuery(
      `
        {
          node(id: "${nodeId}") {
            ...on Widget {
              foo
            }
          }
        }
      `,
    );

    expect(result.node).toEqual({ foo: 'foobar' });
  });

  it('should resolve from object stubs', async () => {
    mockResponses();
    const result = await runQuery(
      `
        {
          node(id: "${nodeId}") {
            ...on Widget {
              user {
                name
                resolvedFavoriteColor
                resolvedUserId
                userId
              }
            }
          }
        }
      `,
    );

    expect(result.node).toEqual({
      user: {
        name: 'Johan Schmidt',
        resolvedFavoriteColor: 'blue',
        resolvedUserId: '2',
        userId: '2',
      },
    });
  });

  it('should createNode', () => {
    const type = new NodeType({
      name: 'Foo',
      fields: () => ({
        foo: {
          type: GraphQLString,
          resolve: createResolve(
            async (obj, args, ctx: MockContext) => {
              await ctx.httpApi.get('foo');
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
