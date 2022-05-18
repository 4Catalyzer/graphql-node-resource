import mock from 'fetch-mock';
import { File, FormData, Headers, Request, Response } from 'undici';

mock.config.Headers = Headers as any;
mock.config.Request = Request as any;
mock.config.Response = Response as any;

export const fetch = mock.sandbox();

export { Headers, Request, Response, File, FormData };
