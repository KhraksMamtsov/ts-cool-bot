import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/Either";
import * as ErrorWithCause from "../../../error/ErrorWithCause";
import * as ShikiTwoslash from "../ShikiTwoslash";

describe("ShikiTwoslash", () => {
  describe("twoslash", () => {
    test("twoslash", async () => {
      //   await ShikiTwoslash.go();
      expect(1).toEqualRight(2);
    });
  });
});
