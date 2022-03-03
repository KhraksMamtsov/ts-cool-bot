import { flow, identity, pipe, constant } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import * as RR from "fp-ts/ReadonlyRecord";
import * as Ap from "fp-ts/Apply";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as R from "fp-ts/Reader";
import * as E from "fp-ts/Either";
import * as IO from "fp-ts/IO";
import { makeMatchers } from "ts-adt/MakeADT";

import * as FS from "./api/fs/FS";
import * as Prism from "./api/prism/Prism";
import * as Html from "./api/html/Html";
import * as Prettier from "./api/prettier/Prettier";
import * as string from "./libs/string/string";
import * as LzString from "./api/ls-string/LzString";
import * as Telegraf from "./api/telegraf/Telegraf";
import * as ErrorWithCause from "./error/ErrorWithCause";

process.on("uncaughtException", (error, origin) => {
  pipe(
    error,
    ErrorWithCause.create({
      type: "UncaughtException",
      context: {
        origin,
      },
    })(identity),
    ErrorWithCause.show,
    console.log
  );

  process.exit(1);
});

const [match, matchP, matchI, matchPI] = makeMatchers("type");

const TEParSequenceS = Ap.sequenceS(TE.ApplyPar);
const RTEParSequenceS = Ap.sequenceS(RTE.ApplyPar);

const CODEBLOCK_REGEX = /```(?:ts|typescript|js|javascript)?\n([\s\S]+)```/;

export const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]*)?(?:\&\w+=[^\s#&]*)*)#code\/([\w\-%+_]+={0,4})/;

export function isNotUndefined<T>(x: T): x is Exclude<T, undefined> {
  return x !== undefined;
}

function isNotNull<T>(x: T): x is Exclude<T, null> {
  return x !== null;
}

type GetTemplateEnv = Readonly<{
  template: Readonly<{
    templatePath: string;
    stylesPath: string;
  }>;
}>;

const getTemplate = pipe(
  RTE.asks<GetTemplateEnv, GetTemplateEnv["template"]>((x) => x.template),
  RTE.chainTaskEitherK(
    flow(
      RR.map(FS.readFile),
      TEParSequenceS,
      TE.map(({ templatePath, stylesPath }) =>
        pipe(templatePath, string.replaceAll("{{style}}", stylesPath))
      )
    )
  )
);
type GetTemplate = typeof getTemplate;

type GetBotDeps = Readonly<{
  telegraf: Readonly<{
    botToken: Telegraf.TelegrafToken;
    options: Telegraf.TelegrafOptions;
  }>;
}>;

const getBot = pipe(
  RTE.asks<GetBotDeps, GetBotDeps["telegraf"]>((x) => x.telegraf),
  RTE.chainEitherK(({ options, botToken }) => Telegraf.init(options)(botToken))
);

type GetBot = typeof getBot;

const bootstrap = pipe(
  RTEParSequenceS<
    GetTemplateEnv & GetBotDeps,
    | ErrorWithCause.ErrorWithCause<FS.ErrorType>
    | ErrorWithCause.ErrorWithCause<Telegraf.ErrorType>,
    {
      template: GetTemplate;
      bot: GetBot;
    }
  >({
    template: getTemplate,
    bot: getBot,
  })
);

type ToImageDeps = { html: { options: Html.ToImageOptions } };
export const toImageRTE = pipe(
  RTE.asks<ToImageDeps, ToImageDeps["html"]>((x) => x.html),
  RTE.map(({ options }) => Html.toImage(options))
);

const getImage = pipe(
  RTE.ask<{ template: string; rawCode: string }>(),
  RTE.bindTo("deps"),
  RTE.bindW("toImage", () => toImageRTE),
  RTE.chainTaskEitherK(({ toImage, deps: { rawCode, template } }) =>
    pipe(
      rawCode,
      Prism.highlight("js"),
      E.map((highlightedCode) =>
        pipe(template, string.replaceAll("{{code}}", highlightedCode))
      ),
      TE.fromEither,
      TE.chainW(toImage)
    )
  )
);

export const from =
  <Args extends ReadonlyArray<unknown>, R>(fn: (...args: Args) => R) =>
  (...args: Args) =>
    constant(fn(...args));

function subscribe({
  bot,
  template,
  html,
}: ToImageDeps & { bot: Telegraf.Bot; template: string }) {
  bot.on("text", async (ctx, next) => {
    console.log("text:", ctx.message);

    const codeBlocks = pipe(
      ctx.message.entities,
      O.fromNullable,
      O.map(
        flow(
          RA.filterMap((x) => {
            switch (x.type) {
              case "url": {
                return pipe(
                  //
                  ctx.message.text,
                  string.getSubstring(x),
                  O.some
                );
              }
              case "text_link": {
                return O.some(x.url);
              }
              default: {
                return O.none;
              }
            }
          }),
          RA.map(
            flow(
              O.fromNullableK((x) => x.match(PLAYGROUND_REGEX)),
              O.chain(RA.lookup(2)),
              O.chain(flow(LzString.decompress, O.fromEither, O.flatten)),
              O.map(
                Prettier.format({
                  parser: "typescript",
                  printWidth: 55,
                  tabWidth: 2,
                  semi: false,
                  bracketSpacing: false,
                  arrowParens: "avoid",
                })
              )
            )
          ),
          (xxx) => {
            console.log("xxx:", xxx);
            return xxx;
          },
          RA.compact,
          RA.map(
            E.mapLeft((x) => {
              console.error(x);
              ErrorWithCause.show(x);
              return x;
            })
          ),
          RA.filter(E.isRight),
          RA.map((x) => x.right)
        )
      ),
      O.chain(RNEA.fromReadonlyArray)
    );

    console.log("codeBlocks: ", codeBlocks);

    if (O.isSome(codeBlocks)) {
      const runAndReactOnCodeBlock = pipe(
        codeBlocks.value,
        RNEA.map((codeBlock) =>
          getImage({ html, template, rawCode: codeBlock })
        ),
        RNEA.map(
          TE.bimap(
            from(console.error),
            from((source) => {
              console.log("typeof source: ", typeof source);
              console.log("source: ", source);

              ctx.editMessageText("", {});

              ctx.replyWithPhoto(
                {
                  source,
                },
                {
                  disable_notification: true,
                  reply_to_message_id: ctx.message.message_id,
                }
              );
            })
          )
        )
      );

      (await Promise.all(runAndReactOnCodeBlock.map((run) => run()))).map(
        // flow(
        E.match(
          (x) => x(),
          (x) => x()
        )
        // )
      );
    }

    await next();
  });

  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
const subscribeR = pipe(
  //
  R.ask<{ bot: Telegraf.Bot; template: string } & ToImageDeps>(),
  R.map(from(subscribe))
);

const program = pipe(
  bootstrap,
  RTE.bindTo("bootstrapResult"),
  RTE.bindW("toImageDeps", () => RTE.ask<ToImageDeps>()),
  RTE.chainFirstIOK(({ bootstrapResult, toImageDeps }) =>
    subscribeR({ ...bootstrapResult, ...toImageDeps })
  ),
  RTE.match(console.error, (x) => x)
);

program({
  template: {
    templatePath: "./src/index.hbs",
    stylesPath: "./src/styles.css",
  },
  telegraf: {
    botToken: process.env.BOT_TOKEN!,
    options: {},
  },
  html: {
    options: {
      quality: 100,
      selector: "code",
      puppeteerArgs: {
        args: ["--no-sandbox"], // for run puppeteer in Heroku
        defaultViewport: {
          height: 3000,
          width: 1000,
          deviceScaleFactor: 4,
        },
      },
    },
  },
})();
