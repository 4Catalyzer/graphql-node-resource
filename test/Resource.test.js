/* @flow */

import { Resource } from '../src';

describe('Resource', () => {
  it('should get make id', () => {
    expect(new Resource({}).makeId({ id: 1 })).toEqual(1);
  });

  it('should throw for unimplemented get()', () => {
    expect(() => new Resource({}).get('1')).toThrow(/not implemented/);
  });
});
