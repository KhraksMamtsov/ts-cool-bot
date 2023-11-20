import * as _Twoslash from "@typescript/twoslash";
import {
  ReadonlyArray as RA,
  Either as E,
  Context,
  String as S,
  Effect,
  pipe,
  Layer,
  Data,
} from "effect";
export interface TwoSlashOptions {
  readonly _: unique symbol;
}
export interface TwoSlashOptionsService extends _Twoslash.TwoSlashOptions {}
export const TwoSlashOptions = Context.Tag<
  TwoSlashOptions,
  TwoSlashOptionsService
>();

export const options = (options: TwoSlashOptionsService) =>
  Layer.succeed(TwoSlashOptions, TwoSlashOptions.of(options));

function render(result: _Twoslash.TwoSlashReturn) {
  const lines = result.code.split("\n");
  let offset = 0;
  const twoslashQuerySign = " ^? ";

  const errorLines = pipe(
    result.errors,
    RA.map((x) => {
      const coords = pipe(
        [x.line, x.character],
        RA.filter((x: number | undefined): x is number => x !== undefined),
        RA.map((x) => x.toString()),
        RA.join(":"),
      );

      let identifier = "";
      if (
        x.line !== undefined &&
        x.character !== undefined &&
        x.length !== undefined
      ) {
        const line = lines[x.line];
        if (line) {
          identifier = line.slice(x.character, x.character + x.length);
        }
      }

      return pipe(
        //
        x.renderedMessage,
        S.split("\n"),
        ([first, ...rest]) =>
          pipe(
            rest,
            RA.map((x) => `// ${x}`),
            RA.prepend(`// TS${x.code} ${coords} "${identifier}": ${first}`),
            RA.join("\n"),
          ),
      );
    }),
    RA.join("\n"),
  );

  result.queries
    .filter((x) => x.kind === "query")
    .sort((a, b) => a.line - b.line)
    .forEach((q) => {
      lines.splice(
        q.line + offset,
        0,
        "//" +
          Array(q.offset - twoslashQuerySign.length + 1)
            .fill(" ")
            .join("") +
          twoslashQuerySign +
          q.text,
      );
      offset++;
    });

  return lines.join("\n").trim() + "\n" + errorLines;
}

const makeLive = pipe(
  TwoSlashOptions,
  Effect.map((options) => {
    const create = (code: string) =>
      pipe(
        E.try({
          try: () => _Twoslash.twoslasher(code, "tsx", options),
          catch: (x) => new TwoslashCreationError({ options, code, case: x }),
        }),
        E.map((x) => ({
          ...x,
          code: render(x),
        })),
      );

    return { create } as const;
  }),
);

interface TwoSlash {
  readonly _: unique symbol;
}
export interface TwoSlashService
  extends Effect.Effect.Success<typeof makeLive> {}
export const TwoSlash = Context.Tag<TwoSlash, TwoSlashService>();
export const TwoSlashLive = Layer.effect(TwoSlash, makeLive);

export enum ErrorType {
  CREATION = "CREATION::TwoslashErrorType",
}

export class TwoslashCreationError extends Data.TaggedError(
  ErrorType.CREATION,
)<{
  readonly case: unknown;
  readonly options: TwoSlashOptionsService;
  readonly code: string;
}> {}
