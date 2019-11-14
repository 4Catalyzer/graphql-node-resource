export default function urlJoin(...parts: Array<any>) {
  return parts.reduce((r, next) => {
    const segment = next == null ? '' : String(next).replace(/^\/+/, '');
    return segment ? `${r!.replace(/\/+$/, '')}/${segment}` : r;
  }, '');
}
