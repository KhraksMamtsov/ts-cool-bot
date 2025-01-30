import { useNewReplies } from "telegraf/future";
import {
  Data,
  Effect,
  Layer,
  Redacted,
  Context,
  Config,
  Exit,
  Cause,
} from "effect";
import * as TO from "./TelegrafOptions.js";
import { styleText } from "node:util";

import type { Update } from "@telegraf/types";
import * as _Telegraf from "telegraf";

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

export interface TelegrafClient
  extends _Telegraf.Telegraf<_Telegraf.Context<Update>> {}

const makeLive = Effect.gen(function* () {
  const options = yield* TO.TelegrafOptions;
  const config = yield* Config.redacted("TELEGRAF_BOT_TOKEN");

  const client = yield* Effect.try({
    try: () => new _Telegraf.Telegraf(Redacted.value(config), options),
    catch: (cause) => new TelegrafInitError({ options, cause }),
  });

  client.use(useNewReplies());

  console.log("TelegrafClient");

  return client;
});

export interface TelegrafService
  extends Effect.Effect.Success<typeof makeLive> {}

export class Telegraf extends Context.Tag("@telegraf/Telegraf")<
  Telegraf,
  TelegrafClient
>() {
  static Live = Layer.effect(this, makeLive);

  static Launch = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Layer.effectDiscard(
      Effect.gen(function* () {
        console.log("Telegraf.Launch");
        const telegrafClient = yield* Telegraf;

        const launch = Effect.tryPromise({
          try: async () => {
            console.log("Telegraf.Launch2");
            await telegrafClient.launch({ dropPendingUpdates: true }, () => {
              const now = new Date();
              console.log(
                styleText("green", `launched`) +
                  " " +
                  styleText(
                    "bgGreen",
                    ` ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()} `
                  )
              );
            });
            return telegrafClient;
          },
          catch: (cause) => new TelegrafLaunchError({ cause }),
        });

        yield* Effect.fork(effect);

        return yield* launch;

        // return yield* Effect.acquireRelease(launch, ([launchedClient], exit) => {
        //   const reason = Exit.match(exit, {
        //     onSuccess: () => undefined,
        //     onFailure: Cause.pretty,
        //   });
        //   console.log("release");
        //   return Effect.sync(() => launchedClient.stop(reason));
        // });
      })
    );
}
