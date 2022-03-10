import { flow, identity, pipe, constant, hole } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import * as RR from "fp-ts/ReadonlyRecord";
import * as Ap from "fp-ts/Apply";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as R from "fp-ts/Reader";
import * as E from "fp-ts/Either";
import * as T from "fp-ts/Task";
import * as IO from "fp-ts/IO";
import { makeMatchers } from "ts-adt/MakeADT";

import * as FS from "./api/fs/FS";
import * as Html from "./api/html/Html";
import * as Prettier from "./api/prettier/Prettier";
import * as string from "./libs/string/string";
import * as LzString from "./api/ls-string/LzString";
import * as Telegraf from "./api/telegraf/Telegraf";
import * as ErrorWithCause from "./error/ErrorWithCause";
import * as ShikiTwoslash from "./api/shiki-twoslash/ShikiTwoslash";
import { parseErrorOrUnknownError } from "./error/parseError";
import { MessageEntity } from "telegraf/typings/core/types/typegram";

console.log("process.versions: ", process.versions);

process.on("uncaughtException", (error, origin) => {
  pipe(
    error,
    ErrorWithCause.create({
      type: "UncaughtException",
      context: {
        origin,
      },
    })(parseErrorOrUnknownError),
    ErrorWithCause.show,
    console.log
  );
});

process.on("unhandledRejection", (reason, promise) => {
  pipe(
    reason,
    ErrorWithCause.create({
      type: "UnhandledRejection",
      context: {
        promise,
      },
    })(parseErrorOrUnknownError),
    ErrorWithCause.show,
    console.log
  );
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
        pipe(
          //
          templatePath,
          string.replaceAll("{{style}}", stylesPath)
        )
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
  RTE.chainTaskEitherK(({ toImage, deps }) =>
    pipe(
      deps.rawCode,
      // Prism.highlight("js"),
      ShikiTwoslash.getHtml,
      TE.map((highlightedCode) =>
        pipe(deps.template, string.replaceAll("{{code}}", highlightedCode))
      ),
      // TE.fromEither,
      TE.chainW(toImage)
    )
  )
);

// IO
export const from =
  <Args extends ReadonlyArray<unknown>, R>(fn: (...args: Args) => R) =>
  (...args: Args) =>
    constant(fn(...args));
// !IO

// codeSource
// enum CodeSourceType
// !codeSource

enum CodeSourceType {
  RAW = "RAW::CodeSourceType",
  COMPRESSED_URL = "COMPRESSED_URL::CodeSourceType",
}

function fromRaw(rawCode: string) {
  return {
    type: CodeSourceType.RAW,
    rawCode,
  } as const;
}

type RawCodeSource = ReturnType<typeof fromRaw>;
function fromCompressedUrl(compressedUrl: string) {
  return {
    type: CodeSourceType.COMPRESSED_URL,
    compressedUrl,
  } as const;
}

type CompressedUrlCodeSource = ReturnType<typeof fromCompressedUrl>;

type CodeSource = RawCodeSource | CompressedUrlCodeSource;

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
          RA.filterMap<MessageEntity, CodeSource>((x) => {
            switch (x.type) {
              case "url": {
                return pipe(
                  //
                  ctx.message.text,
                  string.getSubstring(x),
                  fromCompressedUrl,
                  O.some
                );
              }
              case "pre": {
                return pipe(
                  //
                  ctx.message.text,
                  string.getSubstring(x),
                  fromRaw,
                  O.some
                );
              }
              case "text_link": {
                return pipe(x.url, fromCompressedUrl, O.some);
              }
              default: {
                return O.none;
              }
            }
          }),
          RA.map(
            flow(
              match({
                [CodeSourceType.RAW]: (x) => O.some(x.rawCode),
                [CodeSourceType.COMPRESSED_URL]: (x) =>
                  pipe(
                    x.compressedUrl,
                    O.fromNullableK((x) => x.match(PLAYGROUND_REGEX)),
                    O.chain(RA.lookup(2)),
                    O.chain(flow(LzString.decompress, O.fromEither, O.flatten))
                  ),
              }),
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
          RA.compact,
          RA.filter(E.isRight),
          RA.map((x) => x.right)
        )
      ),
      O.chain(RNEA.fromReadonlyArray)
    );

    if (O.isSome(codeBlocks)) {
      const runAndReactOnCodeBlock = pipe(
        codeBlocks.value,
        RNEA.map((codeBlock) =>
          getImage({ html, template, rawCode: codeBlock })
        ),
        RNEA.sequence(T.ApplicativePar),
        T.map(
          flow(RA.separate, ({ left, right }) => {
            pipe(left, RA.map(console.error));
            ctx.replyWithMediaGroup(
              pipe(
                right,
                RA.map((source) => ({
                  type: "photo",
                  media: { source },
                }))
              ),
              {
                disable_notification: true,
                reply_to_message_id: ctx.message.message_id,
              }
            );
          })
        )
        // (xxx) => xxx,
        // // RNEA.map(T.sequenceArray)
        // RNEA.map(
        //   TE.bimap(
        //     from(console.error),
        //     from((source) => {
        //       console.log("typeof source: ", typeof source);
        //       console.log("source: ", source);

        //       ctx.replyWithMediaGroup(
        //         [
        //           {
        //             type: "photo",
        //             media: {
        //               source,
        //             },
        //           },
        //         ],
        //         {
        //           disable_notification: true,
        //           reply_to_message_id: ctx.message.message_id,
        //         }
        //       );
        //       ctx.replyWithPhoto(
        //         {
        //           source: source,
        //         },
        //         {
        //           disable_notification: true,
        //           reply_to_message_id: ctx.message.message_id,
        //         }
        //       );
        //     })
        //   )
        // )
      );

      const asd = await runAndReactOnCodeBlock();
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
  RTE.chainFirstIOK(({ bootstrapResult, toImageDeps }) => {
    // toImageDeps ??????? WTF
    return subscribeR({
      template: bootstrapResult.template,
      bot: bootstrapResult.bot,
      html: toImageDeps.html,
    });
  }),
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
      type: "png",
      selector: ".shiki",
      puppeteerArgs: {
        args: ["--no-sandbox"], // for run puppeteer in Heroku
        defaultViewport: {
          height: 100,
          width: 400,
          deviceScaleFactor: 3,
        },
      },
    },
  },
})();
