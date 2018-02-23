import urlJoin from '../src/utils/urlJoin';

describe('urlJoin', () => {
  it('should join urls', () => {
    expect(urlJoin('/foo', '5', '/')).toEqual('/foo/5/');
  });

  it('should normalize leading slashes', () => {
    expect(urlJoin('foo', 'bar/')).toEqual('/foo/bar/');
    expect(urlJoin('//foo', '///bar/')).toEqual('/foo/bar/');
  });

  it('should add trailing slashes', () => {
    expect(urlJoin('/foo', 'bar')).toEqual('/foo/bar/');
  });

  it('should handle empty args', () => {
    expect(urlJoin('/foo', undefined, '/', 5, '', null, 'bar')).toEqual(
      '/foo/5/bar/',
    );
  });
});
