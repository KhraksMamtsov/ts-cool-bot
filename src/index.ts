import * as Telegraf from "./api/telegraf/Telegraf";
import {
  Cause,
  Effect,
  Either as E,
  Exit,
  flow,
  identity,
  Layer,
  Option as O,
  pipe,
  ReadonlyArray as RA,
  Sink,
  Stream,
} from "effect";
import * as CS from "./entities/code-source/CodeSource";
import * as TS from "./api/twoslash/TwoSlashService";
import { compress } from "./api/ls-string/LzString";
import { TelegrafBot, TelegrafBotPayload } from "./api/telegraf/TelegrafBot";
import * as TO from "./api/telegraf/TelegrafOptions";
import * as TSO from "./api/twoslash/TwoSlashOptions";
import * as LS from "./api/link-shortner/LinkShortener";
import { options } from "./api/link-shortner/LinkShortenerOptions";

const PLAYGROUND_BASE = "https://www.typescriptlang.org/play/#code/";

const TelegrafLive = pipe(
  Telegraf.TelegrafLive,
  Layer.use(
    TO.options({
      options: {},
      botToken: "5178452921:AAFJ_70Dd6P4mWhcJGCKRzZpAUIJ1lm2ins",
    }),
  ),
);

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
  Layer.use(
    options({
      baseUrl: "https://tsplay.dev",
    }),
  ),
);
const handle = (bot: TelegrafBot) =>
  pipe(
    Stream.merge(bot.text$, bot.editedText$),
    Stream.run(
      Sink.forEach((context) => {
        // if (context.message.text === "throw") {
        //   throw "OUTSIDE";
        // }
        return pipe(
          CS.fromTextMessage(context.message),
          O.match({
            onNone: () =>
              Effect.logInfo(`No payload in: "${context.message.text}"`),
            onSome: (codeBlocks) =>
              Effect.gen(function* (_) {
                const [twoslashService, linkShortenerService] = yield* _(
                  Effect.all([TS.TwoSlash, LS.LinkShortener]),
                );

                const [errors, results] = pipe(
                  codeBlocks,
                  RA.filterMap(CS.code),
                  RA.map(twoslashService.create),
                  RA.separate,
                );

                yield* _(
                  errors,
                  RA.map((x) => Effect.logError(x)),
                  Effect.all,
                );

                const codes = pipe(
                  results,
                  RA.map((x) =>
                    pipe(
                      compress(x.code),
                      Effect.map((x) => PLAYGROUND_BASE + x),
                      Effect.flatMap((url) =>
                        pipe(
                          linkShortenerService.shortenLink({ url }),
                          Effect.timeout("3 seconds"),
                          Effect.flatMap(O.map((x) => x.shortened)),
                          Effect.orElseSucceed(() => url),
                          Effect.map((x) => `[PLAYGROUND](${x})`),
                        ),
                      ),
                      Effect.option,
                      Effect.map(
                        flow(
                          RA.of,
                          RA.append(
                            O.some("```typescript\n" + x.code + "\n```"),
                          ),
                          RA.compact,
                          RA.join("\n"),
                        ),
                      ),
                    ),
                  ),
                );

                const answer = yield* _(
                  Effect.all(codes, { concurrency: 5 }),
                  Effect.map(RA.join("\n")),
                );

                if (context._tag === TelegrafBotPayload.TEXT) {
                  const answerMessage = yield* _(
                    context.replyWithMarkdown(answer, {
                      disable_notification: true,
                      disable_web_page_preview: true,
                      reply_to_message_id: context.message.message_id,
                    }),
                  );
                  yield* _(Effect.log(answerMessage));
                } else {
                  context.replyWithMarkdown;
                }
              }),
          }),
        );
      }),
    ),

    // Stream.orElse(() => Stream.merge(bot.text$, bot.editedText$)),
  );

const program = Effect.gen(function* (_) {
  const telegrafService = yield* _(Telegraf.Telegraf);
  const bot = yield* _(telegrafService.init());

  const handlers = handle(bot.bot).pipe(
    Effect.provide(TwoSlashLive),
    Effect.provide(LinkShortenerOptionsLive),
  );

  yield* _(bot.launch(handlers));
});

const runnable = pipe(
  //
  program,
  Effect.provide(TelegrafLive),
  Effect.scoped,
);

const exit = await Effect.runPromiseExit(runnable);

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
