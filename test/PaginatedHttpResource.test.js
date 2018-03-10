import mockedFetch from 'node-fetch';

import PaginatedHttpResource from '../src/resources/PaginatedHttpResource';
import { MockApi } from './helpers';

describe('PaginatedHttpResource', () => {
  let mockContext;
  beforeEach(() => {
    mockContext = {
      httpApi: new MockApi(),
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
});
