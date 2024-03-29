import * as _Telegraf from "telegraf";
import { useNewReplies } from "telegraf/future";
import {
  Context,
  Data,
  Effect,
  Layer,
  pipe,
  Schedule,
  Secret,
  Fiber,
} from "effect";
import * as TelegrafBot from "./TelegrafBot.js";
import * as TO from "./TelegrafOptions.js";
import * as TC from "./TelegrafConfig.js";

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
  { options: TO.TelegrafOptions, telegrafConfig: TC.TelegrafConfig } as const,
  Effect.all,
  Effect.map(({ options, telegrafConfig }) => {
    const init = () =>
      pipe(
        Effect.try({
          try: () =>
            new _Telegraf.Telegraf(Secret.value(telegrafConfig), options),
          catch: (cause) => new TelegrafInitError({ options, cause }),
        }),
        Effect.tryMap({
          try: (x) => x.use(useNewReplies()),
          catch: (cause) => new TelegrafInitError({ options, cause }),
        }),
        Effect.map((x) => ({
          bot: TelegrafBot.makeBot(x),
          launch: launch(x),
        })),
      );

    const launch =
      (bot: TelegrafBot._Bot) =>
      <A>(effect: Effect.Effect<never, never, A>) =>
        Effect.gen(function* (_) {
          const effectFiber = yield* _(Effect.fork(effect));

          yield* _(
            Effect.tryPromise({
              try: () => {
                console.log("launching");
                return bot.launch();
              },
              catch: (cause) => new TelegrafLaunchError({ cause }),
            }),
          );

          yield* _(Fiber.join(effectFiber));
        }).pipe(
          Effect.tapBoth({ onFailure: Effect.log, onSuccess: Effect.log }),
          Effect.retry(Schedule.exponential("1 seconds", 2)),
        );

    // return pipe(
    //   Effect.runPromiseExit(effect),
    //   (x) => {
    //     x.then(
    //       Exit.match({
    //         onFailure: (x) => {
    //           console.log("launch exit onFailure", x._tag);
    //           console.dir(x, { depth: 1000 });
    //         },
    //         onSuccess: () => {
    //           console.log("launch exit onSuccess");
    //         },
    //       }),
    //     );
    //   },
    //   () =>
    //     Effect.tryPromise({
    //       try: () => {
    //         console.log("launching");
    //         return bot.launch();
    //       },
    //       catch: (cause) => new TelegrafLaunchError({ cause }),
    //     }),
    //   Effect.retry(Schedule.exponential("1 seconds", 2)),
    // );

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
