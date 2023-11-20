export const replaceAll =
  (searchValue: string | RegExp, replaceValue: string) => (str: string) =>
    str.replaceAll(searchValue, replaceValue);

export const getSubstringFrom =
  (str: string) => (params: { offset: number; length: number }) =>
    str.substring(params.offset, params.offset + params.length);
