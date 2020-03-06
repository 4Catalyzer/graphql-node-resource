import camelCase from 'lodash/camelCase';

import translateKeys from '../src/utils/translateKeys';

describe('translateKeys', () => {
  it('should translate keys', () => {
    const date = new Date();
    expect(
      translateKeys(
        {
          foo: date,
          // eslint-disable-next-line @typescript-eslint/camelcase
          foo_bar: { baz__quz: [1, 2, { FOO: 'boom' }] },
        },
        camelCase,
      ),
    ).toEqual({
      foo: date.toISOString(),
      fooBar: {
        bazQuz: [1, 2, { foo: 'boom' }],
      },
    });
  });
});
