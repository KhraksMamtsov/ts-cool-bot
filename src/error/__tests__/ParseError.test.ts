import { parseError, parseErrorWithUnknown } from '../parseError';
import { UnknownErrorWithCause } from '../UnknownErrorWithCause';

class TestError extends Error {}

describe('parseError', () => {
  test('uses onError on Error instance', () => {
    const testError = new TestError('Test error.');
    const onError = jest.fn();
    const onUnknownError = jest.fn();

    parseError(testError, onError, onUnknownError);

    expect(onError).toBeCalledWith(testError);
    expect(onError).toBeCalledTimes(1);
    expect(onUnknownError).toBeCalledTimes(0);
  });

  test('uses onUnknownError on not Error', () => {
    const onError = jest.fn();
    const onUnknownError = jest.fn();

    parseError(123, onError, onUnknownError);

    expect(onUnknownError).toBeCalledWith(123);
    expect(onUnknownError).toBeCalledTimes(1);
    expect(onError).toBeCalledTimes(0);
  });
});

describe('parseErrorWithUnknown', () => {
  test('uses onError on Error instance, and not use onUnknown', () => {
    const testError = new TestError('Test error.');
    const onError = jest.fn();
    const onUnknownError = jest.fn();

    parseErrorWithUnknown(testError, onError, onUnknownError);

    expect(onError).toBeCalledWith(testError);
    expect(onError).toBeCalledTimes(1);
    expect(onUnknownError).toBeCalledTimes(0);
  });

  test('uses Error on Error instance', () => {
    const testError = new TestError('Test error.');
    const onError = jest.fn();

    parseErrorWithUnknown(testError, onError);

    expect(onError).toBeCalledWith(testError);
    expect(onError).toBeCalledTimes(1);
  });

  test('uses UnknownErrorWithCause on not Error instance', () => {
    const onError = jest.fn((x) => x);

    const testResult = parseErrorWithUnknown(123, onError);

    expect(testResult).toBeInstanceOf(UnknownErrorWithCause);
    expect(onError).toBeCalledTimes(1);
  });

  test('uses onUnknownError with UnknownErrorWithCause if not Error instance passed', () => {
    const onError = jest.fn();
    const onUnknownError = jest.fn((x) => x);

    const testUnknown = 123;

    const testResult = parseErrorWithUnknown(testUnknown, onError, onUnknownError);

    expect(onError).toBeCalledTimes(0);
    expect(testResult).toBeInstanceOf(UnknownErrorWithCause);
    expect(testResult.message).toBe('123');
    expect(onUnknownError).toBeCalledTimes(1);
  });
});
