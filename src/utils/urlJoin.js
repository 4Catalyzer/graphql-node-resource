/** @flow */

export default function urlJoin(...parts: Array<?string>) {
  return parts.reduce((r, next) => {
    const segment = next == null ? '' : String(next).replace(/^\/+/, '');
    return segment ? `${r}/${segment}` : r;
  }, '');
}
