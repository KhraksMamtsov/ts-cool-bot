import * as RR from "fp-ts/ReadonlyRecord";

export interface IErrorWithCause<
  Cause extends Error | IErrorWithCause = Error,
  Type extends string = string,
  Context extends RR.ReadonlyRecord<string, unknown> = RR.ReadonlyRecord<
    string,
    unknown
  >
> extends Error {
  readonly __tag: "ErrorWithCause";
  readonly type: Type;
  readonly cause: Cause;
  readonly context?: Context;
}

export class ErrorWithCause<
    Type extends string = string,
    Cause extends Error | IErrorWithCause = Error | IErrorWithCause,
    Context extends RR.ReadonlyRecord<string, unknown> = {}
  >
  extends Error
  implements IErrorWithCause<Cause, Type>
{
  public readonly __tag = "ErrorWithCause";

  constructor(
    public readonly type: Type,
    public override readonly message: string, // override
    public readonly cause: Cause,
    public readonly context?: Context
  ) {
    super(message);
  }
}

export function create<
  Type extends string = string,
  Context extends RR.ReadonlyRecord<string, unknown> = {}
>(args: { type: Type; message?: string; context?: Context }) {
  return function createWithContext<
    X,
    Cause extends Error | IErrorWithCause = Error | IErrorWithCause
  >(fn: (from: X) => Cause) {
    return function createWithContextAndTransformFunction(from: X) {
      return new ErrorWithCause<Type, Cause, Context>(
        args.type,
        args.message ?? "No error message.",
        fn(from),
        args.context
      );
    };
  };
}
