import fetchMock from '@fetch-mock/jest';

import type { HttpContext } from '../src/index.js';
import { RESOURCE_CACHE_KEY } from '../src/index.js';
import { TestHttpApi } from './helpers.js';
import PaginatedHttpResource from '../src/resources/PaginatedHttpResource.js';

describe('PaginatedHttpResource', () => {
  let mockContext: HttpContext<any>;

  beforeEach(() => {
    mockContext = {
      [RESOURCE_CACHE_KEY]: {},
      httpApi: new TestHttpApi(),
    };
  });

  afterEach(() => {
    fetchMock.mockReset();
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

    fetchMock.get('https://gateway/v1/salads?limit=2', {
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

    fetchMock.get('https://gateway/v1/salads?cursor=1&limit=2', {
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

    fetchMock.get('https://gateway/v1/salads?before=3&last=2', {
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

    fetchMock.get('https://gateway/v1/salads?limit=2', {
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

    fetchMock.get('https://gateway/v1/salads?limit=2', {
      status: 200,
      body: { data },
    });

    expect(await resource.getConnection({ first: 2 })).toEqual(null);
  });

  describe('arg validation', () => {
    it('should default to forward when both is specified', async () => {
      const resource = new PaginatedHttpResource(mockContext, {
        endpoint: 'salads',
      });

      await expect(
        resource.getConnection({ after: 'asfs', before: 'afasf' }),
      ).rejects.toThrow(
        '`after` and `before` cursors cannot be specified together',
      );
    });

    it('should allow both limit args', async () => {
      const resource = new PaginatedHttpResource(mockContext, {
        endpoint: 'salads',
      });

      fetchMock.getOnce('https://gateway/v1/salads?cursor=3&limit=2', {
        status: 200,
        body: { data: null },
      });

      expect(
        await resource.getConnection({ after: '3', last: 3, first: 2 }),
      ).toEqual(null);

      fetchMock.getOnce('https://gateway/v1/salads?before=3&last=2', {
        status: 200,
        body: { data: null },
      });

      expect(
        await resource.getConnection({ before: '3', last: 2, first: 2 }),
      ).toEqual(null);
    });

    it('ignores nullish values', async () => {
      const resource = new PaginatedHttpResource(mockContext, {
        endpoint: 'salads',
      });
      const data = null;

      fetchMock.get('https://gateway/v1/salads?limit=2', {
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
