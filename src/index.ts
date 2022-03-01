import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import { promises as fs } from "fs";
import Handlebars from "handlebars";
import nodeHtmlToImage from "node-html-to-image";
import { format } from "prettier";
import prism from "prismjs";
import { Telegraf } from "telegraf";
import * as PgLink from "./core/PgLink";

const CODEBLOCK_REGEX = /```(?:ts|typescript|js|javascript)?\n([\s\S]+)```/;

export const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]*)?(?:\&\w+=[^\s#&]*)*)#code\/([\w\-%+_]+={0,4})/;

function isNotUndefined<T>(x: T): x is Exclude<T, undefined> {
  return x !== undefined;
}

function isNotNull<T>(x: T): x is Exclude<T, null> {
  return x !== null;
}

async function start() {
  const pathsPromises = ["./src/index.hbs", "./src/styles.css"].map((x) => {
    return fs.readFile(x, "utf8");
  });
  const [htmlTemplate, styles] = await Promise.all(pathsPromises);

  const template = Handlebars.compile<{ style: string; code: string }>(
    htmlTemplate,
    {
      noEscape: true,
    }
  );

  function getImageFromHtml(html: string) {
    const htmlCode = prism.highlight(html, prism.languages["js"]!, "js");
    const result = template({
      style: styles!,
      code: htmlCode,
    });

    return nodeHtmlToImage({
      quality: 100,
      selector: "code",
      html: result,
      puppeteerArgs: {
        args: ["--no-sandbox"], // for run puppeteer in Heroku
        defaultViewport: {
          height: 3000,
          width: 1000,
          deviceScaleFactor: 2,
        },
      },
    });
  }

  const bot = new Telegraf(process.env.BOT_TOKEN!);
  bot.on("text", async (ctx, next) => {
    console.log("text:", ctx.message);

    const task = pipe(
      PgLink.parseLinks(ctx.message.entities, ctx.message.text),
      O.match(
        (): Promise<unknown> => Promise.resolve(undefined),
        (linkContents) => {
          const codeBlocks = pipe(
            linkContents,
            RNEA.map((content) =>
              format(content, {
                parser: "typescript",
                printWidth: 55,
                tabWidth: 2,
                semi: false,
                bracketSpacing: false,
                arrowParens: "avoid",
              })
            )
          );

          const answer = codeBlocks
            .map((codeBlock) => getImageFromHtml(codeBlock) as Promise<Buffer>)
            .map(async (x) => {
              const source = await x;
              console.log("typeof source: ", typeof source);
              console.log("source: ", source);

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

          return Promise.all(answer);
        }
      )
    );

    await task;
    await next();
  });

  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

start();
