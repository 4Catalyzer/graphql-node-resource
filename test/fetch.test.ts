import { File, FormData, Response, fetch as mockedFetch } from 'undici';

import { fetch } from '../src';

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
          'Accept': 'application/json',
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
      files: [new File(Buffer.from('Content!'), 'file')],
    });

    expect(mockedFetch.lastCall()![1].body instanceof FormData).toEqual(true);
  });
});
