import FormData from 'form-data';
import fetchMock from '@fetch-mock/jest';

import { fetch } from '../src/index.js';

describe('fetch', () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it('should return a response', async () => {
    fetchMock.get(
      'https://example.com/foo',
      { body: { foo: 42 }, status: 200 },
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    const resp = await fetch({
      method: 'GET',
      url: 'https://example.com/foo',
    });

    expect(resp instanceof Response).toEqual(true);
  });

  it('should handle files', async () => {
    fetchMock.post(
      'https://example.com/foo',
      { body: {}, status: 200 },
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    await fetch({
      method: 'POST',
      url: 'https://example.com/foo',
      data: { foo: 'bar' },
      files: [
        {
          fieldname: 'file',
          buffer: Buffer.from('Content!'),
          originalname: 'file',
        },
      ],
    });

    const lastCall = fetchMock.callHistory.lastCall();
    const body = lastCall?.options?.body;
    expect(body instanceof FormData).toEqual(true);
  });
});
