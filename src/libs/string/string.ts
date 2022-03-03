export function replaceAll(searchValue: string | RegExp, replaceValue: string) {
  return function replaceAllWithOptions(str: string) {
    return str.replaceAll(searchValue, replaceValue);
  };
}

export function getSubstring(params: { offset: number; length: number }) {
  return function getSubstringWithParams(str: string) {
    return str.substring(params.offset, params.offset + params.length);
  };
}
