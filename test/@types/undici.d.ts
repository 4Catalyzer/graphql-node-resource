declare module 'undici' {
  import { FetchMockSandbox } from 'fetch-mock';
  import {
    File,
    FormData,
    Headers,
    Request,
    RequestInit,
    Response,
  } from 'undici';

  declare const fetch: FetchMockSandbox;

  export { fetch, FormData, File, Response, RequestInit, Headers, Request };
}
