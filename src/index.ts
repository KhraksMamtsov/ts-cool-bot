import * as TGF from "./api/telegraf/Telegraf.js";
import { runMain } from "@effect/platform-node/NodeRuntime";
import {
  Effect,
  Either as E,
  Exit,
  Fiber,
  flow,
  Layer,
  Option as O,
  pipe,
  Array,
  Schedule,
  Sink,
  Stream,
} from "effect";
import * as CS from "./entities/code-source/CodeSource.js";
import * as TS from "./api/twoslash/TwoSlashService.js";
import { TelegrafBot } from "./api/telegraf/TelegrafBot.js";
import * as TSO from "./api/twoslash/TwoSlashOptions.js";
import * as LS from "./api/link-shortner/LinkShortener.js";
import * as AT from "./entities/answer-text/AnswerText.js";
import { TelegrafBotPayload } from "./api/telegraf/TelegrafBot.js";
import * as http from "node:http";
import * as TelegrafOptions from "./api/telegraf/TelegrafOptions.js";

const handle = Effect.gen(function* () {
  console.log("handle");
  const bot = yield* TelegrafBot;
  const twoslashService = yield* TS.TwoSlash;
  const linkShortenerService = yield* LS.LinkShortener;

  return yield* pipe(
    bot.text$,
    Stream.merge(bot.help$),
    Stream.merge(bot.caption$),
    Stream.run(
      Sink.forEach(
        flow((context) => {
          // if (true === true) {
          //   throw "123";
          // }
          if (context._tag === TelegrafBotPayload.HELP) {
            return context
              .replyWithMarkdown(
                [
                  "Send me message with code blocks and playground links\\.",
                  "For `@typescript/twoslash` api info [see here](https://github.com/microsoft/TypeScript-Website/tree/v2/packages/ts-twoslasher)\\.",
                ].join("\n"),
                {
                  // disable_web_page_preview: true,
                  disable_notification: true,
                }
              )
              .pipe(Effect.either);
          }
          return pipe(
            CS.fromPayload(context),
            O.match({
              onNone: () =>
                Effect.logInfo(
                  `No payload in: "${JSON.stringify(context.message)}"`
                ),
              onSome: (codeBlocks) => {
                return Effect.gen(function* () {
                  const [errors, results] = pipe(
                    codeBlocks,
                    Array.filterMap(CS.code),
                    Array.map((x, index) =>
                      pipe(
                        x,
                        twoslashService.create,
                        E.map((x) => ({
                          id: index + 1,
                          code: x.code,
                          playgroundUrl: x.playgroundUrl,
                          shortPlaygroundUrl: O.none(),
                        }))
                      )
                    ),
                    Array.separate
                  );

                  yield* pipe(
                    errors,
                    Array.map((x) => Effect.logError(x)),
                    Effect.allWith({
                      concurrency: 5,
                    })
                  );

                  const getShortLinksFiber = yield* pipe(
                    results,
                    Array.map((x) =>
                      pipe(
                        linkShortenerService.shortenLink({
                          url: x.playgroundUrl,
                        }),
                        Effect.retry(Schedule.exponential("2 seconds", 3)),
                        Effect.map((_) => ({
                          ...x,
                          shortPlaygroundUrl: O.some(_.shortened),
                        })),
                        Effect.either
                      )
                    ),
                    Effect.allWith({ concurrency: 3 }),
                    Effect.fork
                  );

                  const answerMessage = yield* pipe(
                    context.replyWithMarkdown(AT.create(results), {
                      disable_notification: true,
                      link_preview_options: { is_disabled: true },
                      // reply_to_message_id: context.message.message_id,
                    })
                    // Effect.tap(Effect.log),
                    // Effect.either
                  );

                  const [editErrors, editMessages] = yield* pipe(
                    Fiber.join(getShortLinksFiber),
                    Effect.map(Array.separate)
                  );

                  yield* pipe(
                    editErrors,
                    Array.map((x) => Effect.logError(x)),
                    Effect.all
                  );

                  // if (answerMessage._tag === "Right") {
                  yield* pipe(
                    context.editMessageText(
                      AT.create(editMessages),
                      answerMessage.message_id,
                      {
                        // disable_web_page_preview: true,
                        link_preview_options: { is_disabled: true },
                        parse_mode: "MarkdownV2",
                      }
                    ),
                    Effect.tap(Effect.log),
                    Effect.either
                  );
                  // } else {
                  //   yield* pipe(Effect.logError(answerMessage.left));
                  // }
                });
              },
            })
          );
        })
      )
    )
  );
});

export const runnable = pipe(
  TGF.Telegraf.Launch(handle),

  Layer.provide(TS.TwoSlash.Default),
  Layer.provide(LS.LinkShortener.Default),
  Layer.provide(TelegrafBot.Default),
  Layer.provide(TGF.Telegraf.Live),
  Layer.provide(TelegrafOptions.options({}))
);

async function run() {
  const qwe = Effect.runPromise(Layer.launch(runnable));

  console.dir(qwe);
}

run();
