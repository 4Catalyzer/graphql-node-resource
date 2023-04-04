# graphql-node-resource

This library implements the [Node GraphQL type defined by Relay](https://relay.dev/docs/guides/graphql-server-specification/#object-identification). Relay requires that a GraphQL server
has a way to identify and refetch GraphQL resources.


## What is a Node?

A `Node` is a refetchable GraphQL resource. All `Node`s must have a _globally unique ID_ and be fetchable via this ID. Relay will refetch these resources in the following way:

```
node(id: $resource_id) {
    ... on Foo {
        bar
        baz
    }
}
```

## The Node Class

The [NodeType](./src/types/NodeType.ts#) class does two things:
1. it defines the `Node` type required by Relay
1. it implements a solution to asynchronously resolve the Node by fetching it from a backing REST API

It is an extension of the [GraphQLObjectType](https://graphql.org/graphql-js/type/#graphqlobjecttype) provided by `graphql-js`.

Every node consists of a backing HTTP REST resource that will be used to fetch the node. This library exposes an [HttpResource class](./src/resources/HttpResource.ts) that implements basic CRUD API operations.

## Usage

### Creating a new Node type

If your API is a standard CRUD API, then all you need to do is create a new instance of a NodeType:

```
import {GraphQLInt} from 'graphql';

// Foo.ts
export default new NodeType({
    // this determines the GraphQL type name
    name: 'Foo',

    // this provides graphql documentation on this type
    description: 'Foo is the catch all example for all things programming',

    // returns an object containing all of the fields for this graphql type
    fields() {
        return {
            bar: {
                type: GraphQLInt,
                description: 'A unit of Foo'
            }
        }
    },

    createResource(ctx) {
        // as long as the `/foo` endpoint follows standard CRUD, then HttpResource should be able
        // to handle fetching it correctly
        return new HttpResource({
            endpoint: "/foo"
        })
    }
});

// Baz.ts
export default new GraphQLObjectType({
    name: 'Baz',
    fields: {
        foo: {
            type: Foo,
            resolve() {
                return {
                    id: 'foo:123'
                }
            }
        }
    }
})
```

The `NodeType` class provides default resolvers for all defined fields. These resolvers will try to fetch the Node from the provided resource and then resolve to the matching field in the response. In order to do this, the `id` field must be present in the object that is being resolved.

In the example above, the resolver for the `foo` field returns an object with an `id` property. The default resolvers provided by the NodeType will use the `id` property to try and fetch the `Foo` resource.


### Adding the Node Field to Your Query Object

In order to fulfill the contract required by Relay, you need to expose a field `node` on your `Query` type.

```
// query.ts
import { getConfig } from '@4c/graphql-node-resource/config';

const config = getConfig();

export default new GraphQLObjectType({
  name: 'Query',

  fields: {
    node: config.nodeField,
    nodes: config.nodesField,
  },
})
```

This will expose `node` and `nodes` on your Query graphql type.

## Best Practices

The following is a list of suggested best practices:
1. One HttpResource for one GraphQL type: an HttpResource should be responsible for fetching a single Resource.

