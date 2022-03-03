import { UnknownErrorWithCause } from "./UnknownErrorWithCause";

export function parseError<TErrorResult, TUnknownResult>(
  x: unknown,
  onError: (x: Error) => TErrorResult,
  onUnknown: (x: unknown) => TUnknownResult
): TErrorResult | TUnknownResult {
  if (x instanceof Error) {
    return onError(x);
  }
  return onUnknown(x);
}

export function parseErrorWithUnknown<TErrorResult>(
  x: unknown,
  onError: (x: Error | UnknownErrorWithCause) => TErrorResult
): TErrorResult;
export function parseErrorWithUnknown<TErrorResult, TUnknownResult>(
  x: unknown,
  onError: (x: Error) => TErrorResult,
  onUnknownError: (x: UnknownErrorWithCause) => TUnknownResult
): TErrorResult | TUnknownResult;
export function parseErrorWithUnknown<TErrorResult, TUnknownResult>(
  x: unknown,
  onError: (x: Error) => TErrorResult,
  onUnknownError?: (x: UnknownErrorWithCause) => TUnknownResult
): TErrorResult | TUnknownResult {
  return parseError(
    //
    x,
    onError,
    (unknown) =>
      (onUnknownError ?? onError)(UnknownErrorWithCause.from(unknown))
  );
}

export function getErrorOrUnknownError(x: unknown) {
  return parseErrorWithUnknown(x, (unknown) => unknown);
}
