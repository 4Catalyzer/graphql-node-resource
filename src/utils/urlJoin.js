/** @flow */

export default function urlJoin(...parts: Array<?string>) {
  let url = parts.reduce((r, next) => {
    const segment = next == null ? '' : String(next).replace(/^\/+/, '');
    return segment ? `${r}/${segment}` : r;
  }, '');
  if (!url.endsWith('/')) url += '/';
  return url;
}
