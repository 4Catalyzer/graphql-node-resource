import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from 'graphql';
import mockedFetch from 'node-fetch';

import { HttpResource } from '../src';
import { config, setup } from '../src/config';
import createResolve from '../src/types/createResolve';
import NodeType from '../src/types/NodeType';
import { MockContext, TestHttpApi, TestHttpResource } from './helpers';

describe('NodeType', () => {
  const nodeId = Buffer.from('Widget:1').toString('base64');

  let schema: GraphQLSchema;
  // let context: any;
  // let NodeType;
  // let createResolve;
  // const { NodeType, createResolve } = rest;

  const context = {
    httpApi: new TestHttpApi(),
  };

  setup({ localIdFieldMode: 'deprecated' });
  // const { nodeField, nodesField, NodeType, getNodeResource } = createNodeType<
  //   HttpContext<any>
  // >({
  //   localIdFieldMode: 'deprecated',
  // });

  async function runQuery(source: string) {
    const result = await graphql({
      schema,
      source,
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
    // ({ NodeType, createResolve } = rest);

    class WidgetResource extends TestHttpResource {
      getFoo() {
        return this.api.foo();
      }
    }

    const User: NodeType<WidgetResource> = new NodeType<WidgetResource>({
      name: 'User',
      fields: () => ({
        name: { type: GraphQLString },
        resolvedFavoriteColor: {
          type: GraphQLString,
          resolve: obj => obj.id,
        },
        resolvedUserId: {
          type: GraphQLString,
          resolve: o => o.id,
        },
      }),
      makeId: a => a.id,
      createResource: ctx => new WidgetResource(ctx, { endpoint: 'users' }),
      localIdFieldName: 'userId',
      // resourceConfig: {
      //   endpoint: 'users',
      // },
    });

    const Widget = new NodeType({
      name: 'Widget',
      fields: () => ({
        name: { type: GraphQLString },
        number: { type: GraphQLInt },
        foo: {
          type: GraphQLString,
          resolve: (_obj, _args, ctx) => Widget.getResource(ctx).getFoo(),
        },
        user: {
          type: User,
        },
      }),
      createResource: ctx => new WidgetResource(ctx, { endpoint: 'a' }),
    });

    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          node: config.nodeField,
          nodes: config.nodesField,
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
            async (obj, _args, ctx: MockContext) => {
              await ctx.httpApi.get('foo');
              return { foo: obj.foo };
            },
            ['foo'],
          ),
        },
      }),
      createResource: ctx => new HttpResource(ctx, { endpoint: 'foo/bar' }),
    });

    expect(type.name).toEqual('Foo');
  });
});
