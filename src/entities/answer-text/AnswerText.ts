import { Option as O, pipe, Array } from "effect";

export type AnswerText = string;

export interface CreationArg {
  readonly id: number;
  readonly code: string;
  readonly playgroundUrl: string;
  readonly shortPlaygroundUrl: O.Option<string>;
}

export type CreationArgs = ReadonlyArray<CreationArg>;
export const create = (args: CreationArgs): AnswerText =>
  pipe(
    args,
    Array.flatMap((x) => {
      const firstLine = pipe(
        [
          O.some(`\\#${x.id}`),
          O.some(`[PLAYGROUND](${x.playgroundUrl})`),
          O.map(
            x.shortPlaygroundUrl,
            (shortPlaygroundUrl) =>
              `\\+ [SHORT\\_PLAYGROUND](${shortPlaygroundUrl})`,
          ),
        ],
        Array.getSomes,
        Array.join(" "),
      );

      return [firstLine, "```typescript", x.code, "```"];
    }),
    Array.join("\n"),
  );
