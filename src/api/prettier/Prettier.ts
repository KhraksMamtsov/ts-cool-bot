import * as _Prettier from "prettier";
import { Effect, Context, Layer, pipe, Data } from "effect";

interface PrettierOptionsTag {
  readonly _: unique symbol;
}
export interface PrettierOptions extends _Prettier.Options {}
export const PrettierOptions = Context.Tag<PrettierOptionsTag, PrettierOptions>(
  "@prettier/PrettierOptions",
);

interface Prettier {
  readonly _: unique symbol;
}
export const Prettier = Context.Tag<Prettier, PrettierService>(
  "@prettier/Prettier",
);
export interface PrettierService
  extends Effect.Effect.Success<typeof makeLive> {}

export enum ErrorType {
  FORMAT = "FORMAT::PrettierErrorType",
}

class PrettierFormatError extends Data.TaggedError(ErrorType.FORMAT)<{
  readonly source: string;
  readonly options: PrettierOptions;
}> {}

const makeLive = pipe(
  PrettierOptions,
  Effect.map((options) => {
    const format = (source: string) =>
      Effect.tryPromise({
        try: () => _Prettier.format(source, options),
        catch: () => new PrettierFormatError({ options, source }),
      });

    return {
      format,
    } as const;
  }),
);
export const PrettierLive = Layer.effect(Prettier, makeLive);
