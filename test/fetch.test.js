/** @flow */

import mockedFetch, { Response } from 'node-fetch';
import FormData from 'form-data';

import { fetch, HttpError } from '../src';

describe('fetch', () => {
  afterEach(() => {
    mockedFetch.restore();
  });

  it('should return a response', async () => {
    mockedFetch.get(
      'https://example.com/foo',
      { body: {}, status: 200 },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );

    const resp = await fetch({
      method: 'GET',
      url: 'https://example.com/foo',
      data: {},
    });

    expect(resp instanceof Response).toEqual(true);
  });

  it('should return an HttpError for failed requests', async () => {
    mockedFetch.get('https://example.com/foo', { body: {}, status: 401 });

    await expect(
      fetch({
        method: 'GET',
        url: 'https://example.com/foo',
      }),
    ).rejects.toThrow(HttpError);
  });

  it('should handle files', async () => {
    mockedFetch.get(
      'https://example.com/foo',
      { body: {}, status: 200 },
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    await fetch({
      method: 'GET',
      url: 'https://example.com/foo',
      data: { foo: 'bar' },
      files: [
        {
          fieldname: 'file',
          buffer: new Buffer('Content!'),
          originalname: 'file',
        },
      ],
    });

    expect(mockedFetch.lastCall()[1].body instanceof FormData).toEqual(true);
  });
});
