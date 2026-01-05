import resolveThunk from '../src/utils/resolveThunk.js';

describe('resolveThunk', () => {
  it('should return non functions', () => {
    const value = {};
    expect(resolveThunk(value)).toEqual(value);
    expect(resolveThunk(undefined)).toEqual(undefined);
  });

  it('should call functions', () => {
    const value = {};
    expect(resolveThunk(() => value)).toEqual(value);
  });
});
