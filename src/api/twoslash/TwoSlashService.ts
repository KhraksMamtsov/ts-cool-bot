import * as _Twoslash from "@typescript/twoslash";
import {
  Context,
  Data,
  Effect,
  Either as E,
  Layer,
  pipe,
  ReadonlyArray as RA,
  String as S,
} from "effect";
import * as TSO from "./TwoSlashOptions.js";

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
        x.renderedMessage,
        S.split("\n"),
        ([first, ...rest]) =>
          pipe(
            rest,
            RA.map((x) => `// ${x}`),
            RA.prepend(`// TS${x.code} ${coords} "${identifier}": ${first}`),
          ),
        (lineContent) => ({
          type: "error" as const,
          lineNumber: x.line === undefined ? undefined : x.line + 1,
          lineContent,
        }),
      );
    }),
  );

  const queriesLines = result.queries
    .filter((x) => x.kind === "query")
    .map((q) => ({
      type: "query" as const,
      lineNumber: q.line,
      lineContent: [
        `//${Array(q.offset - twoslashQuerySign.length + 1)
          .fill(" ")
          .join("")}${twoslashQuerySign}${q.text}`,
      ],
    }));

  const [unindexedLines, indexedLines] = pipe(
    [...queriesLines, ...errorLines],
    RA.map((x) => {
      const { lineNumber } = x;
      return lineNumber === undefined
        ? E.left({ ...x, lineNumber })
        : E.right({ ...x, lineNumber });
    }),
    RA.separate,
  );

  indexedLines
    .sort((a, b) => a.lineNumber - b.lineNumber)
    .forEach((q) => {
      lines.splice(q.lineNumber + offset, 0, ...q.lineContent);
      offset += q.lineContent.length;
    });

  return lines.join("\n").trim() + "\n" + unindexedLines.join("\n");
}

const makeLive = pipe(
  TSO.TwoSlashOptions,
  Effect.map((options) => {
    const create = (code: string) =>
      pipe(
        E.try({
          try: () => _Twoslash.twoslasher(code, "tsx", options),
          catch: (x) => new TwoslashCreationError({ options, code, case: x }),
        }),
        E.map(render),
      );

    return { create } as const;
  }),
);

interface TwoSlash {
  readonly _: unique symbol;
}
export interface TwoSlashService
  extends Effect.Effect.Success<typeof makeLive> {}
export const TwoSlash = Context.Tag<TwoSlash, TwoSlashService>(
  "@twoslash/TwoSlash",
);
export const TwoSlashLive = Layer.effect(TwoSlash, makeLive);

export enum ErrorType {
  CREATION = "CREATION::TwoslashErrorType",
}

export class TwoslashCreationError extends Data.TaggedError(
  ErrorType.CREATION,
)<{
  readonly case: unknown;
  readonly options: TSO.TwoSlashOptionsService;
  readonly code: string;
}> {}
