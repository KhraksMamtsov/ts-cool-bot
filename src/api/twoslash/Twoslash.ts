import {
  twoslasher,
  TwoSlashOptions,
  TwoSlashReturn,
  TwoslashError,
} from "@typescript/twoslash";
import * as E from "fp-ts/Either";
import { flow, identity, pipe } from "fp-ts/lib/function";
import * as ErrorWithCause from "../../error/ErrorWithCause";
import { parseWithUnknown } from "../../error/parseError";

export type Options = TwoSlashOptions;
export type Result = TwoSlashReturn;

export enum ErrorType {
  TWOSLASH_UNKNOWN = "TWOSLASH_UNKNOWN::TwoslashErrorType",
  TWOSLASH = "TWOSLASH::TwoslashErrorType",
  CREATION = "CREATION::TwoslashErrorType",
}

function isTwoslashError(error: Error): error is TwoslashError {
  return error instanceof TwoslashError;
}

// function instanceOf<A, B extends A>(klass: B) {
//     return function isInstanceOfWithKlass(instance: A): instance is B {
//         return instance instanceof klass;
//     }
// }

export function create(options: TwoSlashOptions) {
  return function createWithOptions(code: string) {
    return E.tryCatch(
      () => twoslasher(code, "tsx", options),
      flow(
        ErrorWithCause.create({
          type: ErrorType.CREATION,
          context: {
            options,
            code,
          },
        })(
          flow(
            parseWithUnknown(
              flow(
                E.fromPredicate(
                  isTwoslashError,
                  ErrorWithCause.create({
                    type: ErrorType.TWOSLASH_UNKNOWN,
                  })(identity)
                ),
                E.map(
                  ErrorWithCause.create({
                    type: ErrorType.TWOSLASH,
                  })(identity)
                ),
                E.toUnion
              )
            )
          )
        )
      )
    );
  };
}
