import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/Either";
import * as ErrorWithCause from "../../../error/ErrorWithCause";
import * as ShikiTwoslash from "../ShikiTwoslash";
import { getHtml } from "../ShikiTwoslash";
// const testCode = `function f() {
//     return { x: 10, y: 3 };
// }
// type P = ReturnType<typeof f>;
// //   ^?
// `;

const testCode = `
interface FormFields {
  name: string;
}

class Register {
  form: FormFields = {
    name: 1,
  };

  onChange = (value: string, field: string) => {
    this.form[field] = value;
  };
}`;
describe.skip("ShikiTwoslash", () => {
  describe("twoslash", () => {
    test("twoslash", async () => {
      //   const testCode =
      //     "const ASD = 3;\n" + //
      //     "//    ^?\n" +
      //     "[ASD];\n" +
      //     "//^?";

      //   const testCode = "const ASD: string = 3;";
      const as = await getHtml(testCode)();
      console.log(as);
      expect(1).toEqualRight(as);
    });
  });
});
