export default function urlJoin(
  ...parts: Array<string | undefined | null>
): string {
  return parts.reduce<string>((r, next) => {
    const segment = next == null ? '' : String(next).replace(/^\/+/, '');
    return segment ? `${r!.replace(/\/+$/, '')}/${segment}` : r;
  }, '');
}
