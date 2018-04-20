import resolveThunk from '../src/utils/resolveThunk';

describe('resolveThunk', () => {
  it('should return non functions', () => {
    const value = {};
    expect(resolveThunk(value)).toEqual(value);
    expect(resolveThunk(null)).toEqual(null);
  });

  it('should call functions', () => {
    const value = {};
    expect(resolveThunk(() => value)).toEqual(value);
  });
});
