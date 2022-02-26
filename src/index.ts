import prism from "prismjs";
import { format } from "prettier";
import { promises as fs } from "fs";
import { decompressFromEncodedURIComponent } from "lz-string";
import nodeHtmlToImage from "node-html-to-image";
import Handlebars from "handlebars";
import { Telegraf } from "telegraf";
import { getSubstring } from "./utils";

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

    const codeBlocks = ctx.message.entities
      ?.filter((x) => x.type === "url")
      .map((x) => getSubstring(ctx.message.text, x))
      .map((x) => x.match(PLAYGROUND_REGEX))
      .filter(isNotNull)
      .map((x) => x[2])
      .filter(isNotUndefined)
      .map((x) => decompressFromEncodedURIComponent(x))
      .filter(isNotNull)
      .map((x) =>
        format(x, {
          parser: "typescript",
          printWidth: 55,
          tabWidth: 2,
          semi: false,
          bracketSpacing: false,
          arrowParens: "avoid",
        })
      );

    if (isNotUndefined(codeBlocks)) {
      // const answer = codeBlocks
      //   .map((codeBlock) => "```\n" + codeBlock + "\n```")
      //   .join("");

      const answer = codeBlocks
        .map((codeBlock) => getImageFromHtml(codeBlock) as Promise<Buffer>)
        .map(async (x) => {
          const asd = await x;
          ctx.replyWithPhoto(
            {
              source: asd,
            },
            {
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
}

start();
