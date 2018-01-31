/* @flow */

import type { Args } from '../api/HttpApi';
import HttpResource from './HttpResource';

export default class PaginatedHttpResource extends HttpResource {
  getConnectionBase(path: string, args: Args) {
    return this.api.getPaginatedConnection(path, args);
  }
}
