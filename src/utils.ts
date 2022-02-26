export function getSubstring(
  str: string,
  params: { offset: number; length: number }
) {
  return str.substring(params.offset, params.offset + params.length);
}
