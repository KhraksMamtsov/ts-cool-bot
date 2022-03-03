import { flow, identity, pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import * as RR from "fp-ts/ReadonlyRecord";
import * as Ap from "fp-ts/Apply";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as R from "fp-ts/Reader";
import * as E from "fp-ts/Either";

import * as FS from "./api/fs/FS";
import * as Prism from "./api/prism/Prism";
import * as Html from "./api/html/Html";
import * as Prettier from "./api/prettier/Prettier";
import * as string from "./libs/string/string";
import * as LzString from "./api/ls-string/LzString";
import * as Telegraf from "./api/telegraf/Telegraf";
import { number } from "fp-ts";

const qwe = Ap.sequenceS(TE.ApplyPar);

const CODEBLOCK_REGEX = /```(?:ts|typescript|js|javascript)?\n([\s\S]+)```/;

export const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]*)?(?:\&\w+=[^\s#&]*)*)#code\/([\w\-%+_]+={0,4})/;

export function isNotUndefined<T>(x: T): x is Exclude<T, undefined> {
  return x !== undefined;
}

function isNotNull<T>(x: T): x is Exclude<T, null> {
  return x !== null;
}

type GetTemplateEnv = { templatePath: string; stylesPath: string };

const getTemplate = pipe(
  RTE.ask<GetTemplateEnv>(),
  RTE.chainTaskEitherK(
    flow(
      RR.map(FS.readFile),
      qwe,
      TE.map(({ templatePath, stylesPath }) =>
        pipe(templatePath, string.replaceAll("{{style}}", stylesPath))
      )
    )
  )
);

const q = pipe(
  //
  RTE.ask<{ template: string }>(),
  RTE.map(({ template }) => qqq(template))
);

function qqq(template: string) {
  const w = pipe(
    RTE.ask<{ rawCode: string }>(),
    RTE.map(({ rawCode }) =>
      pipe(
        rawCode,
        Prism.highlight("typescript"),
        E.map((highlightedCode) =>
          pipe(template, string.replaceAll("{{code}}", highlightedCode))
        ),
        TE.fromEither,
        TE.chainW(
          Html.toImage({
            quality: 100,
            selector: "code",
            puppeteerArgs: {
              args: ["--no-sandbox"], // for run puppeteer in Heroku
              defaultViewport: {
                height: 3000,
                width: 1000,
                deviceScaleFactor: 2,
              },
            },
          })
        )
      )
    )
  );
}

type GetBotDeps = {
  botToken: Telegraf.TelegrafToken;
  options: Telegraf.TelegrafOptions;
};
const getBot = pipe(
  RTE.ask<GetBotDeps>(),
  RTE.chainEitherK(({ options, botToken }) => Telegraf.init(options)(botToken))
);

const asd2 = Ap.sequenceS(RTE.ApplyPar);

const program = pipe(
  {
    template: RTE.local<GetTemplateEnv & GetBotDeps, GetTemplateEnv>(identity)(
      getTemplate
    ),
    bot: RTE.local<GetTemplateEnv & GetBotDeps, GetBotDeps>(identity)(getBot),
  },
  RR.sequence(RTE.ApplicativePar)
  // Ap.sequenceS(RTE.ApplyPar)
  // asd2
  // RTE.map((x) => x),
  // (xxx) => xxx
);

const asdasd = program({});

function start() {
  pipe(
    process.env.BOT_TOKEN!,
    Telegraf.init({}),
    E.map((bot) => {
      bot.on("text", async (ctx, next) => {
        console.log("text:", ctx.message);

        const codeBlocks = pipe(
          ctx.message.entities,
          O.fromNullable,
          O.map(
            flow(
              RA.filter((x) => x.type === "url"),
              RA.map((x) =>
                pipe(
                  ctx.message.text,
                  string.getSubstring(x),
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
              RA.compact,
              RA.filter(E.isRight),
              RA.map((x) => x.right)
            )
          ),
          O.chain(RNEA.fromReadonlyArray)
        );

        if (O.isSome(codeBlocks)) {
          const answer = codeBlocks.value
            .map((codeBlock) => getImageFromHtml(codeBlock) as Promise<Buffer>)
            .map(async (x) => {
              const source = await x;
              console.log("typeof source: ", typeof source);
              console.log("source: ", source);

              ctx.editMessageText("", {});

              ctx.replyWithPhoto(
                {
                  source: source, // Buffer
                },
                {
                  disable_notification: true,
                  reply_to_message_id: ctx.message.message_id,
                }
              );
            });

          await Promise.all(answer);
        }

        await next();
      });

      bot.launch();

      process.once("SIGINT", () => bot.stop("SIGINT"));
      process.once("SIGTERM", () => bot.stop("SIGTERM"));
    })
  );
}

start();
