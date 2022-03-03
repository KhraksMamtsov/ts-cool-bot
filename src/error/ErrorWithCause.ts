import * as RR from "fp-ts/ReadonlyRecord";
import * as Json from "fp-ts/Json";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import { string } from "fp-ts";

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

function showErrorInfo(error: Error) {
  return [
    ["Error", error.name],
    ["Message", error.message],
    ["Stack", error.stack ?? "---"],
  ];
}

export function show(error: ErrorWithCause | Error, offset = 0) {
  let resultInfo: [string, string][];
  if ("__tag" in error) {
    resultInfo = [
      ["Error", error.name],
      ["Type", error.type],
      ["Message", error.message],
      [
        "Context",
        pipe(
          //
          error.context,
          Json.stringify,
          E.getOrElse(() => "Stringify Error")
        ),
      ],
      ["Cause", show(error.cause, offset + 2)],
      ["Stack", error.stack ?? "---"],
    ];
  } else {
    resultInfo = [
      ["Error", error.name],
      ["Message", error.message],
      ["Stack", error.stack ?? "---"],
    ];
  }

  return resultInfo //
    .map((x) => " ".repeat(offset) + x.join(": "))
    .join("\n");
}
