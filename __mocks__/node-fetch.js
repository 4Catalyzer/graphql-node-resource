/* @flow */

import mock from 'fetch-mock';
import { Headers, Request, Response } from 'node-fetch';

mock.config.Headers = Headers;
mock.config.Request = Request;
mock.config.Response = Response;

export default mock.sandbox();
export { Headers, Request, Response };
