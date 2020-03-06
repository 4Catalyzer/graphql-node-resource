import mockedFetch from 'node-fetch';

import { HttpContext, RESOURCE_CACHE_KEY } from '../src';
import PaginatedHttpResource from '../src/resources/PaginatedHttpResource';
import { TestHttpApi } from './helpers';

describe('PaginatedHttpResource', () => {
  let mockContext: HttpContext<any>;

  beforeEach(() => {
    mockContext = {
      [RESOURCE_CACHE_KEY]: {},
      httpApi: new TestHttpApi(),
    };
  });

  afterEach(() => {
    mockedFetch.restore();
  });

  it('should get paginated connection', async () => {
    const resource = new PaginatedHttpResource(mockContext, {
      endpoint: 'salads',
    });
    const data = [{ spicy: true }, { spicy: true }];
    const meta = {
      hasNextPage: true,
      cursors: data.map((_, i) => String(i)),
    };

    mockedFetch.get('https://gateway/v1/salads?cursor=&limit=2&pageSize=2', {
      status: 200,
      body: { data, meta },
    });

    expect(await resource.getConnection({ first: 2 })).toEqual({
      edges: data.map((node, idx) => ({
        cursor: String(idx),
        node,
      })),
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: true,
        startCursor: '0',
        endCursor: '1',
      },
      meta: {},
    });
  });

  it('should handle empty lists', async () => {
    const resource = new PaginatedHttpResource(mockContext, {
      endpoint: 'salads',
    });
    const data = [];
    const meta = {
      hasNextPage: true,
      cursors: data.map((_, i) => String(i)),
    };

    mockedFetch.get('https://gateway/v1/salads?cursor=&limit=2&pageSize=2', {
      status: 200,
      body: { data, meta },
    });

    expect(await resource.getConnection({ first: 2 })).toEqual({
      edges: data.map((node, idx) => ({
        cursor: String(idx),
        node,
      })),
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: true,
        startCursor: null,
        endCursor: null,
      },
      meta: {},
    });
  });

  it('should get null if nothing is returned', async () => {
    const resource = new PaginatedHttpResource(mockContext, {
      endpoint: 'salads',
    });
    const data = null;

    mockedFetch.get('https://gateway/v1/salads?cursor=&limit=2&pageSize=2', {
      status: 200,
      body: { data },
    });

    expect(await resource.getConnection({ first: 2 })).toEqual(null);
  });
});
