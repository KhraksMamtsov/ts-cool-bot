import * as Telegraf from "./api/telegraf/Telegraf";
import {
  Cause,
  Effect,
  Exit,
  Layer,
  Option as O,
  pipe,
  ReadonlyArray as RA,
  Sink,
  Stream,
} from "effect";
import * as CS from "./entities/code-source/CodeSource";
import * as TS from "./api/twoslash/TwoSlashService";
import { Payload } from "./api/telegraf/Telegraf";
import { compress } from "./api/ls-string/LzString";

const PLAYGROUND_BASE = "https://www.typescriptlang.org/play/#code/";

const TelegrafLive = pipe(
  Telegraf.TelegrafLive,
  Layer.use(
    Telegraf.options({
      options: {},
      botToken: "5178452921:AAFJ_70Dd6P4mWhcJGCKRzZpAUIJ1lm2ins",
    }),
  ),
);

const TwoSlashLive = pipe(
  TS.TwoSlashLive,
  Layer.use(
    TS.options({
      defaultOptions: {
        noStaticSemanticInfo: true,
        noErrorValidation: true,
      },
    }),
  ),
);
const handle = (bot: Telegraf.Bot) =>
  pipe(
    Stream.merge(bot.text$, bot.editedText$),
    Stream.run(
      Sink.forEach((context) =>
        pipe(
          CS.fromTextMessage(context.message),
          O.match({
            onNone: () =>
              Effect.logInfo(`No payload in: "${context.message.text}"`),
            onSome: (codeBlocks) =>
              Effect.gen(function* (_) {
                const twoslashService = yield* _(TS.TwoSlash);

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

                console.dir(results, {
                  depth: 1000,
                });

                const answer = pipe(
                  results,
                  RA.map((x) =>
                    pipe(
                      compress(x.code),
                      O.getRight,
                      O.map((x) => `[PLAYGROUND](${PLAYGROUND_BASE + x})`),
                      RA.of,
                      RA.append(O.some("```typescript\n" + x.code + "\n```")),
                      RA.compact,
                      RA.join("\n"),
                    ),
                  ),
                  RA.join("\n"),
                );

                if (context._tag === Payload.TEXT) {
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
        ),
      ),
    ),
  );

const program = Effect.gen(function* (_) {
  const telegrafService = yield* _(Telegraf.Telegraf);
  const bot = yield* _(telegrafService.init());

  const handlers = handle(bot.bot).pipe(Effect.provide(TwoSlashLive));

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
      console.log("exit onFailure");
      console.log(Cause.pretty(x));
      console.dir(x, { depth: 1000 });
    },
    onSuccess: () => {
      console.log("exit onSuccess");
    },
  }),
);

console.log("exit: ", exit);
