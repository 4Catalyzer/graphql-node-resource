import asType from '../src/utils/asType.js';

describe('asType', () => {
  it('should cast type', () => {
    class Foo {}
    const value = new Foo();
    expect(asType(value, Foo)).toEqual(value);
  });

  it('should handle subclasses', () => {
    class Foo {}
    class Bar extends Foo {}
    const value = new Bar();

    expect(asType(value, Foo)).toEqual(value);
  });

  it('should throw when not an instance', () => {
    class Foo {}
    class Bar {}
    const value = new Bar();

    expect(() => asType(value, Foo)).toThrow(
      /"Bar" is not an instance of class Foo/,
    );

    expect(() => asType('foo', Foo as any)).toThrow(
      /"foo" is not an instance of class Foo/,
    );
  });
});
