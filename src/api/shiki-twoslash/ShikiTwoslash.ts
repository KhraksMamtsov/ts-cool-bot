import {
  renderCodeToHTML,
  runTwoSlash,
  createShikiHighlighter,
} from "shiki-twoslash";
import * as TE from "fp-ts/TaskEither";
import * as ErrorWithCause from "../../error/ErrorWithCause";
import { flow } from "fp-ts/lib/function";
import { parseErrorOrUnknownError } from "../../error/parseError";
import { writeFileSync } from "fs";

export enum ErrorType {
  CREATION = "CREATION::ShikiTwoslashErrorType",
  TWOSLASH_UNKNOWN = "TWOSLASH_UNKNOWN::ShikiTwoslashErrorType",
  TWOSLASH = "TWOSLASH::ShikiTwoslashErrorType",
  RENDER_HTML = "RENDER_HTML::ShikiTwoslashErrorType",
}

export function getHtml(code: string) {
  return TE.tryCatch(
    async () => {
      const highlighter = await createShikiHighlighter({
        theme: "material-default",
      });
      const twoslash = runTwoSlash(code, "ts", {
        defaultOptions: {
          //   noErrors: true,
          noErrorValidation: true,
        },
      });

      //   const asd: string = 123;
      const html = renderCodeToHTML(
        twoslash.code,
        "ts",
        { twoslash: true },
        { themeName: "material-default" },
        highlighter,
        twoslash
      );

      writeFileSync("output.html", html, "utf8");

      return html;
    },
    flow(
      ErrorWithCause.create({
        type: ErrorType.CREATION,
        context: {
          code,
        },
      })(parseErrorOrUnknownError)
    )
  );
}
