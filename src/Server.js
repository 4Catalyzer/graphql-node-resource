/* @flow */
/* eslint-disable no-underscore-dangle */

import { graphqlExpress } from 'apollo-server-express';
import bodyParser from 'body-parser';
import express from 'express';

import http from 'http';
import multer from 'multer';
import { formatError as baseFormatError } from 'graphql';
import type { GraphQLError, GraphQLSchema } from 'graphql';
import type { Context } from './types/NodeType';

type Config = {
  schema: GraphQLSchema,
  origin: string,
  createContext: Request => Context,
  formatError?: GraphQLError => any,
  port: number,
  pingUrl?: string,
};

export default class GraphQLServer {
  _app: any; // express app
  _server: any; // nodeJS server
  _config: Config;

  constructor(config: Config) {
    const {
      createContext,
      formatError = baseFormatError,
      pingUrl = '/ping',
      schema,
    } = config;

    this._config = config;
    this._app = express();
    this._server = http.createServer((this._app: any));

    this.use(
      '/graphql',
      bodyParser.json(),
      multer({ storage: multer.memoryStorage() }).any(),
      graphqlExpress(req => ({
        schema,
        formatError,
        context: createContext(req),
      })),
    );

    this._app.get(pingUrl, (_, res) => {
      res.send('');
    });
  }

  use(...args: any[]) {
    return this._app.use(...args);
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._server.listen(this._config.port, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._server.close(err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}
