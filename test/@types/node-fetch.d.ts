declare module 'node-fetch' {
  import { Headers, Request, Response } from 'node-fetch';
  import { FetchMockSandbox } from 'fetch-mock';

  declare const fetch: FetchMockSandbox;

  export { Response };
  export default fetch;
}
