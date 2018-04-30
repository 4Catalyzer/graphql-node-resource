/* @flow */

export default function translateKeys(
  data: mixed,
  translate: (key: string) => string,
): mixed {
  if (Array.isArray(data)) {
    return data.map(value => translateKeys(value, translate));
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  const translatedData = {};
  Object.entries(data).forEach(([key, value]) => {
    translatedData[translate(key)] = translateKeys(value, translate);
  });

  return translatedData;
}
