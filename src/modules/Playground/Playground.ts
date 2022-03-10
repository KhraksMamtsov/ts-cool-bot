import * as LzString from "../../api/ls-string/LzString";

const PLAYGROUND_BASE = "https://www.typescriptlang.org/play/#code/";

export function getLink(code: string) {
  return PLAYGROUND_BASE + LzString.decompress(code);
}

