import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/Either";
import * as ErrorWithCause from "../../../error/ErrorWithCause";
import * as Twoslash from "../Twoslash";

describe("Twoslash", () => {
  describe("twoslash", () => {
    test("twoslash", () => {
      const testCode =
        "const ASD = 3; QWE;\n" + //
        "//             ^?";
      const result = pipe(
        testCode,
        Twoslash.create({
          defaultOptions: {
            noErrors: true,
            // showEmit: true,
            noErrorValidation: true,
          },
        }),
        E.mapLeft((error) => {
          return ErrorWithCause.show(error.cause);
        })
      );

      expect(result).toEqualRight(2);
    });
  });
});
