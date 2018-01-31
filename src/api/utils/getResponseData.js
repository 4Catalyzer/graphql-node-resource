/* @flow */

import camelCase from 'lodash/camelCase';

import translateKeys from './translateKeys';

export default function getResponseData<T>({
  data,
  meta,
  links,
}: {
  data?: mixed,
  meta?: mixed,
  links?: mixed,
}): ?T {
  if (!data) {
    return null;
  }

  const translatedData: any = translateKeys(data, camelCase);

  if (meta) {
    translatedData.meta = translateKeys(meta, camelCase);
  }

  if (links) {
    translatedData.links = translateKeys(links, camelCase);
  }

  return translatedData;
}
