declare module 'node-fetch' {
  import { FetchMockSandbox } from 'fetch-mock';
  import { Headers, Request, RequestInit, Response } from 'node-fetch';

  declare const fetch: FetchMockSandbox;

  export { Response, RequestInit };
  export default fetch;
}
