import * as _Telegraf from "telegraf";
import { useNewReplies } from "telegraf/future";
import { Exit, Context, Data, Effect, Layer, pipe } from "effect";
import * as TelegrafBot from "./TelegrafBot";
import * as TO from "./TelegrafOptions";

export enum ErrorType {
  INIT = "INIT::TelegrafErrorType",
  LAUNCH = "LAUNCH::TelegrafErrorType",
}

class TelegrafInitError extends Data.TaggedError(ErrorType.INIT)<{
  readonly cause: unknown;
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
          catch: (cause) => new TelegrafInitError({ options: x, cause }),
        }),
        Effect.map((x) => x.use(useNewReplies())),
        Effect.map((x) => ({
          bot: TelegrafBot.makeBot(x),
          launch: launch(x),
        })),
      );

    const launch =
      (bot: TelegrafBot._Bot) =>
      <E, A>(effect: Effect.Effect<never, E, A>) => {
        const run: Effect.Effect<never, TelegrafLaunchError, void> = pipe(
          Effect.runPromiseExit(effect),
          (x) => {
            x.then((exit) => {
              pipe(
                exit,
                Exit.match({
                  onFailure: (x) => {
                    console.log("exit onFailure", x._tag);
                    console.dir(x, { depth: 1000 });
                  },
                  onSuccess: () => {
                    console.log("exit onSuccess");
                  },
                }),
              );
            });
          },
          () =>
            Effect.tryPromise({
              try: () => {
                console.log("launching");
                return bot.launch();
              },
              catch: (cause) => new TelegrafLaunchError({ cause }),
            }),
          Effect.orElse(() => run), // ?
        );

        return run;
      };

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
