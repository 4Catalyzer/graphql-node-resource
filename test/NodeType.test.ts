import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from 'graphql';
import mockedFetch from 'node-fetch';

import { HttpResource } from '../src';
import { getConfig, setup } from '../src/config';
import NodeType from '../src/types/NodeType';
import createResolve from '../src/types/createResolve';
import { MockContext, TestHttpApi, TestHttpResource } from './helpers';

function mockResponses() {
  mockedFetch.getOnce('https://gateway/v1/widgets/1', {
    status: 200,
    body: {
      data: { id: '1', name: 'Floofh', number: 5, user: { id: '2' } },
    },
  });

  mockedFetch.getOnce('https://gateway/v1/users/2', {
    status: 200,
    body: {
      data: { id: '2', name: 'Johan Schmidt', favoriteColor: 'blue' },
    },
  });
}

describe('NodeType', () => {
  const nodeId = Buffer.from('Widget:1').toString('base64');

  let schema: GraphQLSchema;

  const context = {
    httpApi: new TestHttpApi(),
  };

  async function runQuery(source: string) {
    const result = await graphql({
      schema,
      source,
      contextValue: context,
    });
    if (result.errors) throw result.errors[0];
    return result.data || {};
  }

  setup({ localIdFieldMode: 'deprecated' });

  describe.each([false, true])(
    'resolving nodes lazily: %s',
    (resolveNodesLazily) => {
      beforeEach(() => {
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
              resolve: createResolve(
                (obj) => obj.favoriteColor,
                ['favoriteColor'],
              ),
            },
            resolvedUserId: {
              type: GraphQLString,
              resolve: (o) => o.id,
            },
          }),
          makeId: (a) => a.id,
          makeObjectStub: resolveNodesLazily ? (id) => ({ id }) : undefined,
          createResource: (ctx) =>
            new WidgetResource(ctx, { endpoint: 'users' }),
          localIdFieldName: 'userId',
        });

        const Widget: NodeType<WidgetResource> = new NodeType({
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
          makeObjectStub: resolveNodesLazily ? (id) => ({ id }) : undefined,
          createResource: (ctx) =>
            new WidgetResource(ctx, { endpoint: 'widgets' }),
        });

        schema = new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: {
              node: getConfig().nodeField,
              nodes: getConfig().nodesField,
              widget: { type: Widget },
            },
          }),
        });
      });

      afterEach(() => {
        mockedFetch.reset();
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

      it('should fetch nodes', async () => {
        mockResponses();
        const result = await runQuery(
          `
        {
          nodes(ids: ["${nodeId}"]) {
            ...on Widget {
              name
            }
          }
        }
      `,
        );

        expect(result.nodes).toEqual([{ name: 'Floofh' }]);
      });

      if (resolveNodesLazily) {
        it('should avoid fetching when not required', async () => {
          const result = await runQuery(
            `
            {
              node(id: "${nodeId}") {
                ...on Widget {
                  id
                }
              }
            }
          `,
          );

          expect(result.node).toEqual({ id: nodeId });
          expect(mockedFetch.done()).toBe(true);
          expect(mockedFetch.calls()).toHaveLength(0);
        });
      }

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
    },
  );

  it('should createNode', () => {
    const type: NodeType<HttpResource<TestHttpApi>> = new NodeType({
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
      createResource: (ctx) => new HttpResource(ctx, { endpoint: 'foo/bar' }),
    });

    expect(type.name).toEqual('Foo');
  });

  it('should get make id', () => {
    const type = new NodeType<any, { foo: string; bar: number }>({
      name: 'Foo',
      fields: () => ({
        foo: { type: GraphQLString },
      }),
      createResource: (ctx) => new HttpResource(ctx, { endpoint: 'foo/bar' }),

      makeId: ({ foo, bar }) => `${foo}/${bar}`,
    });

    expect(type.makeId({ foo: 'a', bar: 1 })).toEqual('a/1');
  });
});
