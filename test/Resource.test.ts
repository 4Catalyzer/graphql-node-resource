import { Resource } from '../src';

class MockResource extends Resource<any> {
  get(_id: string) {
    return undefined;
  }
}

describe('Resource', () => {
  it('should get make id', () => {
    expect(new MockResource({}).makeId({ id: 1 })).toEqual(1);
  });
});
