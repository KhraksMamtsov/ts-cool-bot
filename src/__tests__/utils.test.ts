import { getSubstring } from "../utils";

describe("utils", () => {
  test("getSubstring", () => {
    expect(
      getSubstring(
        "qwe https://www.typescriptlang.org/play?#code/C4TwDgpgBAhgzgEygXigcngtBuIA zxc",
        { offset: 4, length: 70 }
      )
    ).toBe(
      "https://www.typescriptlang.org/play?#code/C4TwDgpgBAhgzgEygXigcngtBuIA"
    );
  });
});
