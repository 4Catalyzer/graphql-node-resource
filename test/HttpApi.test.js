/** @flow */

import mockedFetch from 'node-fetch';
import HttpApi from '../src/api/HttpApi';

import { TestHttpApi } from './helpers';
import HttpError from '../src/api/HttpError';

describe('HttpApi', () => {
  afterEach(() => {
    mockedFetch.restore();
  });

  it('should throw for unimplemented request()', async () => {
    await expect(
      new HttpApi({
        apiBase: '',
        externalOrigin: '',
        origin: '',
      }).request('GET', '/foo'),
    ).rejects.toThrow('Not Implemented');
  });

  it('should parse query string', async () => {
    const api = new TestHttpApi();

    expect(api.makePath('foo/1?bar=1', { baz: 'quz' })).toEqual(
      'foo/1?bar=1&baz=quz',
    );
  });

  it('should getExternalUrl', async () => {
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

  it('should return valid for successful get', async () => {
    const api = new TestHttpApi();

    mockedFetch.get('https://gateway/v1/valid_foo', {
      body: { errors: ['foo'] },
      status: 200,
    });

    expect(await api.getValidationResult('valid_foo', {})).toEqual({
      valid: true,
      errors: null,
    });
  });

  it('should return invalid for errors', async () => {
    const api = new TestHttpApi();

    mockedFetch.get('https://gateway/v1/valid_foo', {
      body: { errors: ['foo'] },
      status: 422,
    });

    expect(await api.getValidationResult('valid_foo', {})).toEqual({
      valid: false,
      errors: ['foo'],
    });
  });

  it('should rethrow other errors', async () => {
    const api = new TestHttpApi();

    mockedFetch.get('https://gateway/v1/valid_foo', {
      body: { errors: ['foo'], detail: 'foo' },
      status: 403,
    });

    await expect(api.getValidationResult('valid_foo', {})).rejects.toEqual(
      expect.any(HttpError),
    );
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

    expect(await loader.load('1')).toEqual(null);
  });
});
