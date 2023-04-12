// GraphQL Types - these make up our GQL API
// a BlogPost is fetchable by an ID and needs to be used in a connection so we make this a NodeType

import {
  NodeType,
  Resource,
  HttpContext,
  PaginatedHttpResource,
} from '@4c/graphql-node-resource';
import { GraphQLString } from 'graphql';

// any item used in a Connection must be a NodeType
export default new NodeType<
  Resource<HttpContext>,
  { id: string; authorId: string }
>({
  name: 'BlogPost',
  // we use a "thunk" for the fields to avoid a circular dependency
  // this allows all of the Types to be defined before being referenced
  fields: () => ({
    author: {
      // avoid a circular dependency
      type: require("./Author").default,

      resolve: (source) => {
        // a NodeType can fetch itself if `id` is provided.
        return { id: source.authorId };
      },
    },
    title: {
      type: GraphQLString,
    },
    content: {
      type: GraphQLString,
    },
  }),
  createResource(context) {
    return new PaginatedHttpResource(context, { endpoint: '/blog/posts/' });
  },
});
