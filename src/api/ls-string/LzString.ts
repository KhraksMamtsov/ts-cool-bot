import { decompressFromEncodedURIComponent } from "lz-string";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/lib/function";
import * as EWC from "../../error/ErrorWithCause";
import { parseErrorOrUnknownError } from "../../error/parseError";

export enum ErrorType {
  DECOMPRESS = "DECOMPRESS:LzStringErrorType",
}

export function decompress(compressed: string) {
  return pipe(
    E.tryCatch(
      () => decompressFromEncodedURIComponent(compressed),
      EWC.create({
        type: ErrorType.DECOMPRESS,
        context: {
          compressed,
        },
      })(parseErrorOrUnknownError)
    ),
    E.map(O.fromNullable)
  );
}
