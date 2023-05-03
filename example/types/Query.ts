import { HttpContext, HttpResource } from '@4c/graphql-node-resource';
import { GraphQLObjectType, GraphQLList } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { config } from '../setup';
import Author from './Author';
import BlogPost from './BlogPost';

export default new GraphQLObjectType<any, HttpContext>({
  name: 'Query',
  fields: {
    // required for relay but also a good practice as this allows getting
    // hard to reach nodes easily.
    node: config.nodeField,
    nodes: config.nodesField,

    posts: {
      type: new GraphQLList(BlogPost),
      resolve(_rc, _args, context, _info) {
        // you can use the resource on the NodeType to fetch the GQL type
        // from the backend from a parent type.
        const resource = BlogPost.getResource(context) as HttpResource;
        return resource.get();
      },
    },
    postsConnection: {
      // NodeType has a Connection type that can be used to automatically create connections
      type: BlogPost.Connection,
      resolve: (_source, args, context) => {
        const resource = BlogPost.getResource(context) as HttpResource;
        return resource.getConnection(args);
      },
      // there is a standard set of args for a connection. You can also add other ones
      // by spreading this object and adding additional fields such as filters.
      args: connectionArgs,
    },
    authors: {
      type: new GraphQLList(Author),
      resolve(_rc, _args, context, _info) {
        // you can use the resource on the NodeType to fetch the GQL type
        // from the backend from a parent type.
        const resource = Author.getResource(context) as HttpResource;
        return resource.get();
      },
    },
    authorsConnection: {
      // NodeType has a Connection type that can be used to automatically create connections
      type: Author.Connection,
      resolve: (_source, args, context) => {
        const resource = Author.getResource(context) as HttpResource;
        return resource.getConnection(args);
      },
      // there is a standard set of args for a connection. You can also add other ones
      // by spreading this object and adding additional fields such as filters.
      args: connectionArgs,
    },
  },
});
