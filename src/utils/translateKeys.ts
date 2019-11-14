export default function translateKeys(
  data: unknown,
  translate: (key: string) => string,
): unknown {
  if (Array.isArray(data)) {
    return data.map(value => translateKeys(value, translate));
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  const translatedData: { [key: string]: unknown } = {};

  Object.entries(data as {}).forEach(([key, value]) => {
    translatedData[translate(key)] = translateKeys(value, translate);
  });

  return translatedData;
}
