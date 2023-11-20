import * as _Telegraf from "telegraf";
import { useNewReplies } from "telegraf/future";
import { Context, Data, Effect, Layer, pipe } from "effect";
import * as TelegrafBot from "./TelegrafBot";
import * as TO from "./TelegrafOptions";

export enum ErrorType {
  INIT = "INIT::TelegrafErrorType",
  LAUNCH = "LAUNCH::TelegrafErrorType",
}

class TelegrafInitError extends Data.TaggedError(ErrorType.INIT)<{
  readonly options: TO.TelegrafOptionsService;
}> {}
class TelegrafLaunchError extends Data.TaggedError(ErrorType.LAUNCH)<{
  readonly cause: unknown;
}> {}

const makeLive = pipe(
  TO.TelegrafOptions,
  Effect.map((x) => {
    const init = () =>
      pipe(
        Effect.try({
          try: () => new _Telegraf.Telegraf(x.botToken, x.options),
          catch: () => new TelegrafInitError({ options: x }),
        }),
        Effect.map((x) => x.use(useNewReplies())),
        Effect.map((x) => ({
          bot: TelegrafBot.makeBot(x),
          launch: launch(x),
        })),
      );

    const launch =
      (bot: TelegrafBot._Bot) =>
      <E, A>(effect: Effect.Effect<never, E, A>) =>
        pipe(
          //
          Effect.runPromiseExit(effect),
          () =>
            Effect.tryPromise({
              try: () => bot.launch(),
              catch: (cause) => new TelegrafLaunchError({ cause }),
            }),
        );

    return { init } as const;
  }),
);

interface Telegraf {
  readonly _: unique symbol;
}
export interface TelegrafService
  extends Effect.Effect.Success<typeof makeLive> {}
export const Telegraf = Context.Tag<Telegraf, TelegrafService>(
  "@telegraf/Telegraf",
);

export const TelegrafLive = Layer.effect(Telegraf, makeLive);
