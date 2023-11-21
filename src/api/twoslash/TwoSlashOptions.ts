import * as _Twoslash from "@typescript/twoslash";
import { Context, Layer } from "effect";

export interface TwoSlashOptions {
  readonly _: unique symbol;
}

export interface TwoSlashOptionsService extends _Twoslash.TwoSlashOptions {}

export const TwoSlashOptions = Context.Tag<
  TwoSlashOptions,
  TwoSlashOptionsService
>("@twoslash/TwoSlashOptions");

export const options = (options: TwoSlashOptionsService) =>
  Layer.succeed(TwoSlashOptions, TwoSlashOptions.of(options));
