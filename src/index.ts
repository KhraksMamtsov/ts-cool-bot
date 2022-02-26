import prism from "prismjs";
import { format } from "prettier";
import { promises as fs } from "fs";
import { decompressFromEncodedURIComponent } from "lz-string";
// import nodeHtmlToImage from "node-html-to-image";
import Handlebars from "handlebars";
import { Telegraf } from "telegraf";
import { getSubstring } from "./utils";

const CODEBLOCK_REGEX = /```(?:ts|typescript|js|javascript)?\n([\s\S]+)```/;

export const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]*)?(?:\&\w+=[^\s#&]*)*)#code\/([\w\-%+_]+={0,4})/;

let resultHtml: string;

function isNotUndefined<T>(x: T): x is Exclude<T, undefined> {
  return x !== undefined;
}

function isNotNull<T>(x: T): x is Exclude<T, null> {
  return x !== null;
}
// try {
//   // Make lines as short as reasonably possible, so they fit in the embed.
//   // We pass prettier the full string, but only format part of it, so we can
//   // calculate where the endChar is post-formatting.
//   resultHtml = format(source, {
//     parser: "typescript",
//     printWidth: 55,
//     tabWidth: 2,
//     semi: false,
//     bracketSpacing: false,
//     arrowParens: "avoid",
//     // rangeStart: startChar,
//     // rangeEnd: endChar,
//   });
// } catch (e) {
//   console.log("xxx", e);
//   // Likely a syntax error
//   resultHtml = source;
// }
// console.log(prism.plugins);
// const htmlCode = prism.highlight(resultHtml, prism.languages["js"]!, "js");

// async function start() {
//   const pathsPromises = ["./src/index.hbs", "./src/styles.css"].map((x) => {
//     return fs.readFile(x, "utf8");
//   });
//   const [htmlTemplate, styles] = await Promise.all(pathsPromises);

//   const template = Handlebars.compile<{ style: string; code: string }>(
//     htmlTemplate,
//     {
//       noEscape: true,
//     }
//   );

//   const result = template({
//     style: styles!,
//     code: htmlCode,
//   });

//   await fs.writeFile("./image.html", result);

//   // await nodeHtmlToImage({
//   //   output: "./image.png",
//   //   quality: 100,
//   //   selector: "code",
//   //   html: result,
//   //   puppeteerArgs: {
//   //     defaultViewport: {
//   //       height: 3000,
//   //       width: 1000,
//   //       deviceScaleFactor: 2,
//   //     },
//   //   },
//   // }).then(() => console.log("The image was created successfully!"));
// }

// start();

const bot = new Telegraf(process.env.BOT_TOKEN!);
bot.on("text", async (ctx, next) => {
  console.log("text:", ctx.message.entities);

  const codeBlocks = ctx.message.entities
    ?.filter((x) => x.type === "url")
    .map((x) => getSubstring(ctx.message.text, x))
    .map((x) => x.match(PLAYGROUND_REGEX))
    .filter(isNotNull)
    .map((x) => x[2])
    .filter(isNotUndefined)
    .map((x) => decompressFromEncodedURIComponent(x))
    .filter(isNotNull);

  if (isNotUndefined(codeBlocks)) {
    const answer = codeBlocks
      .map((codeBlock) => "```" + codeBlock + "```")
      .join("\n\n");
    const asd = await ctx.replyWithHTML(answer, {
      parse_mode: "Markdown",
      disable_notification: true,
    });
  }

  await next();
});

bot.start((ctx) => {
  ctx.reply("Hello " + ctx.from.first_name + "!");
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
