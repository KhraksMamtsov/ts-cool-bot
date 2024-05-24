import * as Telegraf from "./api/telegraf/Telegraf.js";
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
import type { TelegrafBot } from "./api/telegraf/TelegrafBot.js";
import * as TO from "./api/telegraf/TelegrafOptions.js";
import * as TSO from "./api/twoslash/TwoSlashOptions.js";
import * as LS from "./api/link-shortner/LinkShortener.js";
import { options } from "./api/link-shortner/LinkShortenerOptions.js";
import * as AT from "./entities/answer-text/AnswerText.js";
import { TelegrafBotPayload } from "./api/telegraf/TelegrafBot.js";
import * as http from "node:http";

const TelegrafLive = pipe(Telegraf.TelegrafLive, Layer.provide(TO.options({})));
const TwoSlashLive = pipe(
  TS.TwoSlashLive,
  Layer.provide(
    TSO.options({
      defaultOptions: {
        noStaticSemanticInfo: true,
        noErrorValidation: true,
      },
    })
  )
);

const LinkShortenerOptionsLive = pipe(
  LS.LinkShortenerLive,
  Layer.provide(options({ baseUrl: "https://tsplay.dev" }))
);

const handle = (bot: TelegrafBot) => {
  return pipe(
    bot.text$,
    Stream.merge(bot.help$),
    Stream.merge(bot.caption$),
    Stream.run(
      Sink.forEach(
        flow((context) => {
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
                  const [twoslashService, linkShortenerService] =
                    yield* Effect.all([TS.TwoSlash, LS.LinkShortener]);

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
                          shortPlaygroundUrl: O.none<string>(),
                        }))
                      )
                    ),
                    Array.separate
                  );

                  yield* pipe(
                    errors,
                    Array.map((x) => Effect.logError(x)),
                    Effect.allWith({
                      concurrency: "unbounded",
                    })
                  );

                  const getShortLinksFiber = yield* pipe(
                    results,
                    Array.map((x) =>
                      pipe(
                        linkShortenerService.shortenLink({
                          url: x.playgroundUrl,
                        }),
                        Effect.map((_) => ({
                          ...x,
                          shortPlaygroundUrl: O.some(_.shortened),
                        })),
                        Effect.retry(Schedule.exponential("2 seconds", 3)),
                        Effect.either
                      )
                    ),
                    Effect.allWith({ concurrency: 3 }),
                    Effect.fork
                  );

                  const answerMessage = yield* pipe(
                    context.replyWithMarkdown(AT.create(results), {
                      disable_notification: true,
                      // disable_web_page_preview: true,
                      // reply_to_message_id: context.message.message_id,
                    }),
                    Effect.tap(Effect.log),
                    Effect.either
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

                  if (answerMessage._tag === "Right") {
                    yield* pipe(
                      context.editMessageText(
                        AT.create(editMessages),
                        answerMessage.right.message_id,
                        {
                          // disable_web_page_preview: true,
                          parse_mode: "MarkdownV2",
                        }
                      ),
                      Effect.tap(Effect.log),
                      Effect.either
                    );
                  } else {
                    yield* pipe(Effect.logError(answerMessage.left));
                  }
                });
              },
            })
          );
        })
      )
    )
  );
};

const program = Effect.gen(function* () {
  const telegrafService = yield* Telegraf.Telegraf;
  const { bot, launch } = yield* telegrafService.init();
  yield* handle(bot).pipe(
    Effect.provide(TwoSlashLive),
    Effect.provide(LinkShortenerOptionsLive),
    Effect.catchAll(Effect.log),
    Effect.scoped,
    launch
  );
});

const runnable = program.pipe(Effect.scoped, Effect.provide(TelegrafLive));

Effect.runPromiseExit(runnable).then(
  Exit.match({
    onFailure: (x) => {
      console.log("runPromiseExit exit onFailure", x._tag);
      console.dir(x, { depth: 1000 });
    },
    onSuccess: () => {
      console.log("runPromiseExit exit onSuccess");
    },
  })
);

const port = process.env["PORT"];

if (port) {
  http
    .createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.write("Hello World!");
      res.end();
    })
    .listen(Number(port));
}
