import { Context, Layer } from "effect";
import * as _Telegraf from "telegraf";

type TelegrafCtorParams = ConstructorParameters<typeof _Telegraf.Telegraf>;
export type _TelegrafOptions = Exclude<TelegrafCtorParams[1], undefined>;
export type TelegrafToken = TelegrafCtorParams[0];

export interface TelegrafOptions {
  readonly _: unique symbol;
}
export interface TelegrafOptionsService {
  readonly options: _TelegrafOptions;
  readonly botToken: TelegrafToken;
}
export const TelegrafOptions = Context.Tag<
  TelegrafOptions,
  TelegrafOptionsService
>("@telegraf/TelegrafOptions");
export const options = (options: TelegrafOptionsService) =>
  Layer.succeed(TelegrafOptions, TelegrafOptions.of(options));
