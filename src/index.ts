import * as Telegraf from "./api/telegraf/Telegraf.js";
import {
  Effect,
  Either as E,
  Exit,
  Fiber,
  flow,
  identity,
  Layer,
  Option as O,
  pipe,
  ReadonlyArray as RA,
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

const TelegrafLive = pipe(Telegraf.TelegrafLive, Layer.use(TO.options({})));
const TwoSlashLive = pipe(
  TS.TwoSlashLive,
  Layer.use(
    TSO.options({
      defaultOptions: {
        noStaticSemanticInfo: true,
        noErrorValidation: true,
      },
    }),
  ),
);

const LinkShortenerOptionsLive = pipe(
  LS.LinkShortenerLive,
  Layer.use(options({ baseUrl: "https://tsplay.dev" })),
);
const handle = (bot: TelegrafBot) =>
  pipe(
    bot.text$,
    Stream.merge(bot.help$),
    Stream.run(
      Sink.forEach(
        flow((context) => {
          if (context._tag === TelegrafBotPayload.HELP) {
            return context.replyWithMarkdown(
              [
                "Send me message with code blocks and playground links\\.",
                "For `@typescript/twoslash` api info [see here](https://github.com/microsoft/TypeScript-Website/tree/v2/packages/ts-twoslasher)\\.",
              ].join("\n"),
              {
                disable_web_page_preview: true,
                disable_notification: true,
              },
            );
          }
          return pipe(
            CS.fromTextMessage(context.message),
            O.match({
              onNone: () =>
                Effect.logInfo(`No payload in: "${context.message.text}"`),
              onSome: (codeBlocks) => {
                return Effect.gen(function* (_) {
                  const [twoslashService, linkShortenerService] = yield* _(
                    Effect.all([TS.TwoSlash, LS.LinkShortener]),
                  );

                  const [errors, results] = pipe(
                    codeBlocks,
                    RA.filterMap(CS.code),
                    RA.map((x, index) =>
                      pipe(
                        x,
                        twoslashService.create,
                        E.map((x) => ({
                          id: index + 1,
                          code: x.code,
                          playgroundUrl: x.playgroundUrl,
                          shortPlaygroundUrl: O.none<string>(),
                        })),
                      ),
                    ),
                    RA.separate,
                  );

                  yield* _(
                    errors,
                    RA.map((x) => Effect.logError(x)),
                    Effect.all,
                  );

                  const getShortLinksFiber = yield* _(
                    results,
                    RA.map((x) =>
                      pipe(
                        linkShortenerService.shortenLink({
                          url: x.playgroundUrl,
                        }),
                        Effect.map((_) => ({
                          ...x,
                          shortPlaygroundUrl: O.some(_.shortened),
                        })),
                        Effect.retry(Schedule.exponential("2 seconds", 3)),
                        Effect.either,
                      ),
                    ),
                    Effect.allWith({ concurrency: 3 }),
                    Effect.timeout("3 seconds"),
                    Effect.flatMap(identity),
                    Effect.fork,
                  );

                  const answerMessage = yield* _(
                    context.replyWithMarkdown(AT.create(results), {
                      disable_notification: true,
                      disable_web_page_preview: true,
                      reply_to_message_id: context.message.message_id,
                    }),
                    Effect.tap(Effect.log),
                  );

                  const [editErrors, editMessages] = yield* _(
                    Fiber.join(getShortLinksFiber),
                    Effect.map(RA.separate),
                  );

                  yield* _(
                    editErrors,
                    RA.map((x) => Effect.logError(x)),
                    Effect.all,
                  );

                  const editedMessage = yield* _(
                    context.editMessageText(
                      AT.create(editMessages),
                      answerMessage.message_id,
                      {
                        disable_web_page_preview: true,
                        parse_mode: "MarkdownV2",
                      },
                    ),
                    Effect.tap(Effect.log),
                  );

                  return editedMessage;
                });
              },
            }),
          );
        }, Effect.unified),
      ),
    ),
  );

const program = Effect.gen(function* (_) {
  const telegrafService = yield* _(Telegraf.Telegraf);
  const bot = yield* _(telegrafService.init());

  const handlers = handle(bot.bot).pipe(
    Effect.provide(TwoSlashLive),
    Effect.provide(LinkShortenerOptionsLive),
    Effect.catchAll(Effect.log),
  );
  yield* _(bot.launch(handlers));
});

const runnable = pipe(
  //
  program,
  Effect.provide(TelegrafLive),
  Effect.scoped,
);

Effect.runPromiseExit(runnable).then(
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
