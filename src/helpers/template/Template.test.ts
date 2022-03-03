import { pipe } from "fp-ts/lib/function";
import * as Template from "./Template";

describe("Template", () => {
  test("contextP", () => {
    expect(
      pipe(
        //
        Template.compile<"a" | "b">("{{a}}-{{b}}-{{c}}"),
        (xxx) => xxx,
        Template.contextP({ a: "a1", c: "b1" }),
        (xxx) => xxx,
        // Template.contextP({ a: "a", b: "b" }),
        Template.finalize
      )
    ).toBe("a-b-{{c}}");
  });
});
