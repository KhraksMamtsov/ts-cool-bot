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
function longest<T extends { length: number }>(a: T, b: T) {
  if (a.length >= b.length) {
    return a;
  } else {
    return b;
  }
}
// longerArray is of type 'number[]'
const longerArray = longest([1, 2], [1, 2, 3]);
// longerString is of type 'string'
const longerString = longest("alice", "bob");
// Error! Numbers don't have a 'length' property
const notOK = longest(10, 100);
const hello: boolean = longest("alice", "bob");
console.log(hello);
// ^?
`;
describe("ShikiTwoslash", () => {
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
