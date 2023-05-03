// an Author is fetchable by an ID and needs to be used in a connection so we make this a NodeType
// any item used in a Connection must be a NodeType. Note this also has a connection to BlogPost.

import {
  NodeType,
  Resource,
  HttpContext,
  PaginatedHttpResource,
  HttpResource,
} from '@4c/graphql-node-resource';
import { GraphQLString, GraphQLList } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import BlogPost from './BlogPost';

// You can parameterize the NodeType to provide type data to be used in the field resolvers.
export default new NodeType<Resource<HttpContext>, { id: string; blogPostIds: string[] }>({
  name: 'Author',
  fields: () => ({
    name: {
      type: GraphQLString,
    },

    // Normally you would only use a connection, this is to demonstrate
    // how NodeTypes can fetch themselves within a list.
    blogPosts: {
      type: new GraphQLList(BlogPost),
      resolve(source) {
        // each node can fetch itself if it has an id in the source object
        // map the ids to an object containing an `id` field
        return source.blogPostIds.map(id => ({id}))
      },
    },

    blogPostsConnection: {
        type: BlogPost.Connection,
        args: connectionArgs,
        resolve(source, args, context) {
            const resource = BlogPost.getResource(context) as HttpResource;
            // filter by this author's id. Note that the source object's id is the non-global id.
            // whereas the `id` field converts this to a global id automatically.
            return resource.getConnection({...args, authorId: source.id})
        }
    }
  }),
  createResource(context) {
    return new PaginatedHttpResource(context, { endpoint: '/blog/authors/' });
  },
});
