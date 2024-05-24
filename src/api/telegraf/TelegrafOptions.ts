import { Layer, Effect } from "effect";
import * as _Telegraf from "telegraf";

type TelegrafCtorParams = ConstructorParameters<typeof _Telegraf.Telegraf>;
export type _TelegrafOptions = Exclude<TelegrafCtorParams[1], undefined>;
export type TelegrafToken = TelegrafCtorParams[0];

export interface TelegrafOptionsService extends _TelegrafOptions {}

export class TelegrafOptions extends Effect.Tag("@telegraf/TelegrafOptions")<
  TelegrafOptions,
  TelegrafOptionsService
>() {}
export const options = (options: TelegrafOptionsService) =>
  Layer.succeed(TelegrafOptions, TelegrafOptions.of(options));
