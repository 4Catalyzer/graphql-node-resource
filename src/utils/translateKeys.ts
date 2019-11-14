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

  if (typeof data !== 'object' || !data) {
    return data;
  }

  const translatedData: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    translatedData[translate(key)] = translateKeys(value, translate);
  });

  return translatedData;
}
