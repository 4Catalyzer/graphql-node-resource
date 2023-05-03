// omit the "localId" field - include only the `id` field for NodeTypes

import {
  setup,
  HttpApi as BaseHttpApi,
  fetch,
  HttpMethod,
} from '@4c/graphql-node-resource';
import { getConfig } from '@4c/graphql-node-resource/config';
import { Maybe } from '@4c/graphql-node-resource/utils/typing';

// see the documentation for `setup` for more information.
setup({ localIdFieldMode: 'omit' });

export const config = getConfig();

// Define how to fetch data from our backend. This will be injected into the context later and used by the NodeType instance.
export class HttpApi extends BaseHttpApi {
  async request<T = any>(
    method: HttpMethod,
    reqUrl: string,
    data?: unknown,
  ): Promise<Maybe<T>> {
    console.log(`Making request`, { method, reqUrl, data });

    const response = await fetch({
      method,
      url: reqUrl,
      data: data ? (data as any) : undefined,
    });

    if (!response.ok) {
      console.log(`Received response`, { status: response.status });
      throw new Error(
        `Bad response: ${response.status} / ${response.statusText}`,
      );
    }

    try {
      // assume our server only responds with JSON
      const jsonResponse: any = await response.json();

      // we can assume this is a connection object
      if ('data' in jsonResponse && 'meta' in jsonResponse) {
        // the Connection property on NodeType instances assumes an array of items with a meta property
        // that contains the required pageInfo data. See `api.ts` for what the shape of this response is.
        const items = jsonResponse.data;
        Object.assign(items, {
          meta: jsonResponse.meta,
        });

        return items;
      }

      return jsonResponse;
    } catch (error) {
      console.error('Could not read JSON data');

      throw error;
    }
  }

  constructor() {
    super({
      apiBase: '/api',
      origin: 'http://localhost:8080',
      // you can use external origin in case your API has both an internal and external endpoint
      // in this case, we don't. Set it to a safe URL.
      externalOrigin: 'http://example.com',
    });
  }
}
