# Example Application

This example application shows how to create a GraphQL API over a REST API utilizing the `graphql-node-resource` library. There
are two parts to this example application:
1. a REST API implemented via NodeJS with Express. The API exposes a simple blog resource and supports pagination.
2. a GraphQL API that exposes the REST API. This shows how to utilize the `graphql-node-resource` library properly.

## Running the App

```sh
# go to root of the example app
cd example;

# install the deps
yarn # or npm install

# start the app
yarn start # or npm run start
```

Navigate to the URL thats output on the terminal. You should be able to run this query:
```graphql
{
  authors {
    name
    id
    blogPosts {
      title
    }
    blogPostsConnection {
      edges {
        node {
          title
        }
      }
    }
  }
}
```

## api/api.ts

This is where the REST API lives. It may be useful to look at the entry and exit points of the API to see what the GraphQL server passes
as input and expects as output. This is especially useful for looking at the paginated connection endpoints. Connections need to be supported
via the underlying REST API.

## GraphQL API

The GraphQL API is composed of 3 main parts:
1. `setup.ts` - this is required to tell the library how to fetch resources from the REST API as well as some basic configuration
2. `types/*.ts` - these are the GraphQL types that make up the GraphQL API
3. `index.ts` - this is the entry point for the GraphQL API. It calls the setup.ts module and combines all of the types

## Starting Point

A good starting point would be the `types/Query.ts` file. This is the entrypoint into any of the API endpoints.

The app will run the GraphIQL tool. Navigate to the [outputted server url](http://localhost:8081/graphql) to interact with the API.