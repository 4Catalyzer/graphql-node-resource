import range from 'lodash/range';
import mockedFetch from 'node-fetch';

import { HttpError } from '../src';
import { TestHttpApi } from './helpers';

describe('HttpApi', () => {
  afterEach(() => {
    mockedFetch.restore();
  });

  it('should parse query string', () => {
    const api = new TestHttpApi();

    expect(api.makePath('foo/1?bar=1', { baz: 'quz' })).toEqual(
      'foo/1?bar=1&baz=quz',
    );
  });

  it('should getExternalUrl', () => {
    const api = new TestHttpApi();

    expect(api.getExternalUrl('foo/1', { bar: 1 })).toEqual(
      'https://example.com/v1/foo/1?bar=1',
    );
  });

  it('should cache gets', async () => {
    const api = new TestHttpApi();

    mockedFetch.get('https://gateway/v1/foo/1', { body: {}, status: 200 });

    await Promise.all([api.get('foo/1'), api.get('foo/1'), api.get('foo/1')]);

    expect(mockedFetch.calls('https://gateway/v1/foo/1')).toHaveLength(1);
  });

  it('should re throw get errors', async () => {
    const api = new TestHttpApi();

    mockedFetch.get('https://gateway/v1/foo/1', { body: '{}', status: 409 });

    await expect(api.get('foo/1')).rejects.toThrow(HttpError);
  });

  it('should create an arg loader', async () => {
    const api = new TestHttpApi();

    mockedFetch.get('https://gateway/v1/dressings?saladId=1', {
      body: { data: [{ saladId: '1' }, { saladId: '1' }] },
      status: 200,
    });

    const loader = api.createArgLoader('dressings', 'saladId');

    const [resultA, resultB] = await Promise.all([
      loader.load('1'),
      loader.load('1'),
    ]);

    expect(resultA).toEqual([{ saladId: '1' }, { saladId: '1' }]);
    expect(resultA === resultB).toEqual(true);
    expect(
      mockedFetch.calls('https://gateway/v1/dressings?saladId=1'),
    ).toHaveLength(1);
  });

  it('should create an arg loader that returns an empty set', async () => {
    const api = new TestHttpApi();

    mockedFetch.get('https://gateway/v1/dressings?saladId=1', {
      body: { data: null },
      status: 200,
    });

    const loader = api.createArgLoader('dressings', 'saladId');

    expect(await loader.load('1')).toEqual([]);
  });

  it('should chunk arg loader requests', async () => {
    const api = new TestHttpApi();

    const keys = range(api.numKeysPerChunk + 5).map(String);

    const params = keys.map((key) => `saladId=${key}`);
    const chunk1Params = params.slice(0, api.numKeysPerChunk);
    const chunk2Params = params.slice(api.numKeysPerChunk);

    const data = keys.map((saladId) => ({ saladId }));
    const chunk1Data = data.slice(0, api.numKeysPerChunk);
    const chunk2Data = data.slice(api.numKeysPerChunk);

    mockedFetch.get(`https://gateway/v1/dressings?${chunk1Params.join('&')}`, {
      body: { data: chunk1Data },
      status: 200,
    });
    mockedFetch.get(`https://gateway/v1/dressings?${chunk2Params.join('&')}`, {
      body: { data: chunk2Data },
      status: 200,
    });

    const loader = api.createArgLoader('dressings', 'saladId');

    expect(await Promise.all(keys.map((key) => loader.load(key)))).toEqual(
      data.map((item) => [item]),
    );
  });
});
