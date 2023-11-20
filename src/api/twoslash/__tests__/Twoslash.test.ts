import { pipe, Effect, Exit } from "effect";
import * as ErrorWithCause from "../../../error/ErrorWithCause";
import * as Twoslash from "../TwoSlashService";

describe("Twoslash", () => {
  describe("twoslash", () => {
    test("twoslash", () => {
      const testCode =
        "const ASD = 3; [ASD];\n" + //
        "//    ^?        ^?";

      const result = pipe(
        testCode,
        Twoslash.create,
        Effect.provideService(Twoslash.TwoSlash, {
          defaultOptions: {
            noErrors: true,
            noErrorValidation: true,
          },
        }),
        Effect.runSyncExit,
        Exit.mapError((x) => ErrorWithCause.show(x.cause)),
      );

      if (Exit.isSuccess(result)) {
        expect(result.value).toBe(2);
      } else {
        expect(false).toBe(true);
      }
    });
  });
});
