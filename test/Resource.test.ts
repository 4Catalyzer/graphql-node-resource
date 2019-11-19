import { Resource } from '../src';

describe('Resource', () => {
  it('should get make id', () => {
    class ConcreteResource extends Resource<any> {}
    expect(new ConcreteResource({}).makeId({ id: 1 })).toEqual(1);
  });
});
