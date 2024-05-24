import * as _Prettier from "prettier";
import { Effect, Context, Layer, Data } from "effect";

export class PrettierOptions extends Context.Tag("@prettier/PrettierOptions")<
  PrettierOptions,
  _Prettier.Options
>() {}

export class Prettier extends Effect.Tag("@prettier/Prettier")<
  Prettier,
  PrettierService
>() {}
export interface PrettierService
  extends Effect.Effect.Success<typeof makeLive> {}

export enum ErrorType {
  FORMAT = "FORMAT::PrettierErrorType",
}

class PrettierFormatError extends Data.TaggedError(ErrorType.FORMAT)<{
  readonly source: string;
  readonly options: _Prettier.Options;
}> {}

const makeLive = PrettierOptions.pipe(
  Effect.map((options) => {
    const format = (source: string) =>
      Effect.tryPromise({
        try: () => _Prettier.format(source, options),
        catch: () => new PrettierFormatError({ options, source }),
      });

    return {
      format,
    } as const;
  })
);
export const PrettierLive = Layer.effect(Prettier, makeLive);
