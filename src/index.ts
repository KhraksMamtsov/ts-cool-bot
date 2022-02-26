import prism from "prismjs";
import { format } from "prettier";
import { promises as fs } from "fs";
// import nodeHtmlToImage from "node-html-to-image";
import Handlebars from "handlebars";
import { Telegraf } from "telegraf";

const CODEBLOCK_REGEX = /```(?:ts|typescript|js|javascript)?\n([\s\S]+)```/;

export const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]*)?(?:\&\w+=[^\s#&]*)*)#code\/([\w\-%+_]+={0,4})/;

const source = `
// hello ts
  interface Point {
    x: number,
    y: number,
  }
   
  function distance(a: Point, b: Point): number {
    return Math.sqrt(
      (a.x - b.x) ** 2 +
      (a.y - b.y) ** 2);
  }

  export type ThemeDictSpacing = Record<'s' | 'm', number>;
type Test = ThemeDictSpacing & number[];
import a from 'fp-ts';

enum ASd {
  asd = 0,
  // a
  qwe = 'qwe',
  zxc = 1 << 0
}

interface qqq {
  asd: 123
}

@decor
abstract class Klass extends qqq {
  constructor () {
    super()
    const s = this.asd;
  }
}
function fun() : void {
return false;
}

declare module 'asd' {
}

const test: Test = Object.assign([1,2,3], dict);
  `;

let resultHtml: string;
try {
  // Make lines as short as reasonably possible, so they fit in the embed.
  // We pass prettier the full string, but only format part of it, so we can
  // calculate where the endChar is post-formatting.
  resultHtml = format(source, {
    parser: "typescript",
    printWidth: 55,
    tabWidth: 2,
    semi: false,
    bracketSpacing: false,
    arrowParens: "avoid",
    // rangeStart: startChar,
    // rangeEnd: endChar,
  });
} catch (e) {
  console.log("xxx", e);
  // Likely a syntax error
  resultHtml = source;
}
console.log(prism.plugins);
const htmlCode = prism.highlight(resultHtml, prism.languages["js"]!, "js");

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

  const result = template({
    style: styles!,
    code: htmlCode,
  });

  await fs.writeFile("./image.html", result);

  // await nodeHtmlToImage({
  //   output: "./image.png",
  //   quality: 100,
  //   selector: "code",
  //   html: result,
  //   puppeteerArgs: {
  //     defaultViewport: {
  //       height: 3000,
  //       width: 1000,
  //       deviceScaleFactor: 2,
  //     },
  //   },
  // }).then(() => console.log("The image was created successfully!"));
}

start();

const bot = new Telegraf(process.env.BOT_TOKEN!);
bot.command("oldschool", (ctx) => ctx.reply("Hello"));
bot.command("modern", (ctx) => ctx.reply("Yo"));
bot.command("hipster", Telegraf.reply("λ"));
bot.on("text", async (ctx, next) => {
  console.log("text:", ctx.message);

  const asd = await ctx.replyWithHTML("```code```", {
    parse_mode: "Markdown",
    disable_notification: true,
  });

  console.log("asd: ", asd);
  // ctx.message;

  await next();
});
bot.on("message", async (ctx, next) => {
  console.log("message:", ctx.message);

  const asd = await ctx.replyWithHTML("```code```", {
    parse_mode: "Markdown",
    disable_notification: true,
  });

  console.log("asd: ", asd);
  // ctx.message;

  await next();
});

bot.start((ctx) => {
  ctx.reply("Hello " + ctx.from.first_name + "!");
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
