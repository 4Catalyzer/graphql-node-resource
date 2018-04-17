/* @flow */

import mockedFetch from 'node-fetch';
import { connectionFromArray } from 'graphql-relay';

import HttpResource from '../src/resources/HttpResource';
import { MockApi } from './helpers';

describe('HttpResource', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      httpApi: new MockApi(),
    };
  });

  afterEach(() => {
    mockedFetch.restore();
  });

  it('should get', async () => {
    const resource = new HttpResource(mockContext, { endpoint: 'salads' });
    const data = { spicy: true };

    mockedFetch.get('https://gateway/v1/salads/5', {
      status: 200,
      body: { data },
    });

    expect(await resource.get('5')).toEqual(data);
  });

  it('should get list', async () => {
    const resource = new HttpResource(mockContext, { endpoint: 'salads' });
    const data = [{ spicy: true }];

    mockedFetch.get('https://gateway/v1/salads', {
      status: 200,
      body: { data },
    });

    expect(await resource.get()).toEqual(data);
  });

  it('should get unpaginated connection', async () => {
    const resource = new HttpResource(mockContext, { endpoint: 'salads' });
    const data = [{ spicy: true }, { spicy: true }, { spicy: true }];

    mockedFetch.get('https://gateway/v1/salads', {
      status: 200,
      body: { data },
    });

    expect(await resource.getConnection({ first: 2 })).toEqual(
      connectionFromArray(data, { first: 2 }),
    );
  });

  it('should create', async () => {
    const resource = new HttpResource(mockContext, { endpoint: 'salads' });
    const data = { spicy: true };

    mockedFetch.post('https://gateway/v1/salads', {
      status: 200,
      body: { data },
    });

    expect(await resource.create(data)).toEqual(data);
  });

  it('should update', async () => {
    const resource = new HttpResource(mockContext, { endpoint: 'salads' });
    const data = { spicy: true };

    mockedFetch.patch('https://gateway/v1/salads/5', {
      status: 200,
      body: { data },
    });

    expect(await resource.update('5', data)).toEqual(data);
  });

  it('should delete', async () => {
    const resource = new HttpResource(mockContext, { endpoint: 'salads' });

    mockedFetch.delete('https://gateway/v1/salads/5', {
      status: 204,
    });

    expect(await resource.delete('5')).toEqual(null);
  });
});
