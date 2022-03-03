import * as E from "fp-ts/Either";
import { format as _format, Options } from "prettier";
import * as EWC from "../../error/ErrorWithCause";
import { getErrorOrUnknownError } from "../../error/parseError";

export enum ErrorType {
  FORMAT = "FORMAT::PrettierErrorType",
}

export function format(options: Options) {
  return function formatWithOptions(source: string) {
    return E.tryCatch(
      () => _format(source, options),
      EWC.create({
        type: ErrorType.FORMAT,
        context: {
          options,
          source,
        },
      })(getErrorOrUnknownError)
    );
  };
}
