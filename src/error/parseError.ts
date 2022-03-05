import { flow, identity } from "fp-ts/lib/function";
import { UnknownErrorWithCause } from "./UnknownErrorWithCause";

export function parse<TUnknownResult>(
  parseUnknown: (x: unknown) => TUnknownResult
) {
  return function parseWithUnknown<TErrorResult>(
    parseError: (x: Error) => TErrorResult
  ) {
    return function parseWithUnknownAndError(x: unknown) {
      if (x instanceof Error) {
        return parseError(x);
      }
      return parseUnknown(x);
    };
  };
}

export const parseWithUnknown = parse(UnknownErrorWithCause.from);
export const parseErrorOrUnknownError = parseWithUnknown(identity);
