/**
 * This helper function transforms all keys of an object calling the provided `translate` function. This helper
 * recursively iterates through the entire object. Useful in conjunction with lodash's string transformation functions
 * such as "kebabCase".
 * 
 * Note: it has a special behavior if the value is a Date. It calls `Date.toISOString` on any Date value found in the object.
 * 
 * @example
 * console.log(
 *   translateKey({
 *     hello: 'world',
 *     bar: new Date(),
 *     arr: [1, 2, {test: 10}]
 *   }, (key) => {
 *      return `foo_${key}`
 *   })
 * ); // {foo_hello: 'world', bar: '2022-01-01T00:00:00Z', arr: [1, 2, {foo_test: 10}]}
 * 
 * @param data any
 * @param translate a function that is called on every key for any encountered object
 * @returns a copy of the original data with all keys or values transformed by the provided `translate` function
 */
export default function translateKeys(
  data: unknown,
  translate: (key: string) => string,
): unknown {
  if (Array.isArray(data)) {
    return data.map((value) => translateKeys(value, translate));
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (typeof data !== 'object' || !data) {
    return data;
  }

  const translatedData: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    translatedData[translate(key)] = translateKeys(value, translate);
  });

  return translatedData;
}
