import * as _Twoslash from "@typescript/twoslash";
import { Effect, Layer } from "effect";

export interface TwoSlashOptionsService extends _Twoslash.TwoSlashOptions {}

export class TwoSlashOptions extends Effect.Tag("@twoslash/TwoSlashOptions")<
  TwoSlashOptions,
  TwoSlashOptionsService
>() {}

export const options = (options: TwoSlashOptionsService) =>
  Layer.succeed(TwoSlashOptions, TwoSlashOptions.of(options));
