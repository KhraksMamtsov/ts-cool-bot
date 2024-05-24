import * as _Telegraf from "telegraf";
import { useNewReplies } from "telegraf/future";
import { Data, Effect, Layer, pipe, Schedule, Secret, Fiber } from "effect";
import * as TelegrafBot from "./TelegrafBot.js";
import * as TO from "./TelegrafOptions.js";
import * as TC from "./TelegrafConfig.js";
import { styleText } from "node:util";

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
        Effect.acquireRelease((x) => Effect.succeed(() => x.stop())),
        Effect.tryMap({
          try: (x) => x.use(useNewReplies()),
          catch: (cause) => new TelegrafInitError({ options, cause }),
        }),
        Effect.map((x) => ({
          bot: TelegrafBot.makeBot(x),
          launch: launch(x),
        }))
      );

    const launch =
      (bot: TelegrafBot._Bot) =>
      <A>(effect: Effect.Effect<A>) =>
        Effect.gen(function* () {
          const effectFiber = yield* Effect.fork(effect);

          yield* Effect.tryPromise({
            try: () => {
              const now = new Date();
              console.log(
                styleText("green", `launching`) +
                  " " +
                  styleText(
                    "bgGreen",
                    ` ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()} `
                  )
              );
              return bot.launch();
            },
            catch: (cause) => new TelegrafLaunchError({ cause }),
          });

          yield* Fiber.join(effectFiber);
        }).pipe(
          Effect.tapBoth({ onFailure: Effect.log, onSuccess: Effect.log }),
          Effect.retry(Schedule.exponential("1 seconds", 2))
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
  })
);

export interface TelegrafService
  extends Effect.Effect.Success<typeof makeLive> {}

export class Telegraf extends Effect.Tag("@telegraf/Telegraf")<
  Telegraf,
  TelegrafService
>() {}

export const TelegrafLive = Layer.effect(Telegraf, makeLive);
