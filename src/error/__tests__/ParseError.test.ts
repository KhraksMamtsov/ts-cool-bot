import { parse, parseWithUnknown } from "../parseError";
import { UnknownErrorWithCause } from "../UnknownErrorWithCause";

class TestError extends Error {}

describe("parseError", () => {
  test("uses onError on Error instance", () => {
    const testError = new TestError("Test error.");
    const onError = jest.fn();
    const onUnknownError = jest.fn();

    parse(onUnknownError)(onError)(testError);

    expect(onError).toBeCalledWith(testError);
    expect(onError).toBeCalledTimes(1);
    expect(onUnknownError).toBeCalledTimes(0);
  });

  test("uses onUnknownError on not Error", () => {
    const onError = jest.fn();
    const onUnknownError = jest.fn();

    parse(onUnknownError)(onError)(123);

    expect(onUnknownError).toBeCalledWith(123);
    expect(onUnknownError).toBeCalledTimes(1);
    expect(onError).toBeCalledTimes(0);
  });
});

describe("parseErrorWithUnknown", () => {
  test("uses Error on Error instance", () => {
    const testError = new TestError("Test error.");
    const onError = jest.fn();

    parseWithUnknown(onError)(testError);

    expect(onError).toBeCalledWith(testError);
    expect(onError).toBeCalledTimes(1);
  });

  test("uses UnknownErrorWithCause on not Error instance", () => {
    const onError = jest.fn((x) => x);

    const testResult = parseWithUnknown(onError)(123);

    expect(testResult).toBeInstanceOf(UnknownErrorWithCause);
    expect(onError).toBeCalledTimes(0);
  });
});
