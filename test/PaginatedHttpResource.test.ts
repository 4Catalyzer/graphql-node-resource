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

    mockedFetch.get('https://gateway/v1/salads?limit=2&pageSize=2', {
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

  it('should get forward paginated connection', async () => {
    const resource = new PaginatedHttpResource(mockContext, {
      endpoint: 'salads',
    });

    const data = [{ spicy: true }, { spicy: true }];
    const meta = {
      hasNextPage: true,
      cursors: data.map((_, i) => String(i + 1)),
    };

    mockedFetch.get('https://gateway/v1/salads?limit=2&pageSize=2&cursor=1', {
      status: 200,
      body: { data, meta },
    });

    expect(await resource.getConnection({ first: 2, after: '1' })).toEqual({
      edges: data.map((node, idx) => ({
        cursor: String(idx + 1),
        node,
      })),
      pageInfo: {
        hasPreviousPage: true,
        hasNextPage: true,
        startCursor: '1',
        endCursor: '2',
      },
      meta: {},
    });
  });

  it('should get backward paginated connection', async () => {
    const resource = new PaginatedHttpResource(mockContext, {
      endpoint: 'salads',
    });

    const data = [{ spicy: true }, { spicy: true }];
    const meta = {
      // server always returns this hasNextPage
      hasNextPage: true,
      cursors: data.map((_, i) => String(i)),
    };

    mockedFetch.get('https://gateway/v1/salads?limit=2&pageSize=2&before=3', {
      status: 200,
      body: { data, meta },
    });

    expect(await resource.getConnection({ last: 2, before: '3' })).toEqual({
      edges: data.map((node, idx) => ({
        cursor: String(idx),
        node,
      })),
      pageInfo: {
        hasPreviousPage: true,
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

    mockedFetch.get('https://gateway/v1/salads?limit=2&pageSize=2', {
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

    mockedFetch.get('https://gateway/v1/salads?limit=2&pageSize=2', {
      status: 200,
      body: { data },
    });

    expect(await resource.getConnection({ first: 2 })).toEqual(null);
  });

  describe('arg validation', () => {
    it('should not allow both directions at once', async () => {
      const resource = new PaginatedHttpResource(mockContext, {
        endpoint: 'salads',
      });

      await expect(
        resource.getConnection({ after: 'asfs', before: 'afasf' }),
      ).rejects.toThrowError(
        '`after` and `before` cursors cannot be specified together',
      );

      await expect(
        resource.getConnection({ first: 0, last: 10 }),
      ).rejects.toThrowError(
        '`first` and `last` cannot be specified together',
      );
    });

    it('should prevent bawards pagination without a cursor', async () => {
      const resource = new PaginatedHttpResource(mockContext, {
        endpoint: 'salads',
      });

      await expect(resource.getConnection({ last: 10 })).rejects.toThrowError(
        'Server does not support backwards pagination without a `before` cursor',
      );
    });

    it('ignores nullish values', async () => {
      const resource = new PaginatedHttpResource(mockContext, {
        endpoint: 'salads',
      });
      const data = null;

      mockedFetch.get('https://gateway/v1/salads?limit=2&pageSize=2', {
        status: 200,
        body: { data },
      });

      await expect(
        resource.getConnection({
          last: null,
          first: 2,
          before: null,
          after: undefined,
        }),
      ).resolves.toEqual(null);
    });
  });
});
