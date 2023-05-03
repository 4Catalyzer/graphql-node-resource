// make sure we init the setup module first
import { HttpApi } from './setup';

import { graphqlHTTP } from 'express-graphql';
import { GraphQLSchema } from 'graphql';

import express from 'express';
import start from './api/api';
import Query from './types/Query';

// start the REST API server
start(8080);

var app = express();
app.use(
  '/graphql',
  graphqlHTTP({
    schema: new GraphQLSchema({ query: Query }),
    graphiql: true,
    context: {
      httpApi: new HttpApi(),
    },
  }),
);

// start the GQL HTTP server
const port = 8081;
app.listen(port, () => {
    console.log(`Running a GraphQL API server at http://localhost:${8081}/graphql`);
});
