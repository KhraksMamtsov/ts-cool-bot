import {
  renderCodeToHTML,
  runTwoSlash,
  createShikiHighlighter,
} from "shiki-twoslash";
import * as TE from "fp-ts/TaskEither";
import * as ErrorWithCause from "../../error/ErrorWithCause";
import { flow } from "fp-ts/lib/function";
import { parseErrorOrUnknownError } from "../../error/parseError";

export enum ErrorType {
  CREATION = "CREATION::ShikiTwoslashErrorType",
  TWOSLASH_UNKNOWN = "TWOSLASH_UNKNOWN::ShikiTwoslashErrorType",
  TWOSLASH = "TWOSLASH::ShikiTwoslashErrorType",
  RENDER_HTML = "RENDER_HTML::ShikiTwoslashErrorType",
}

export function getHtml(code: string) {
  return TE.tryCatch(
    async () => {
      const highlighter = await createShikiHighlighter({ theme: "monokai" });
      const twoslash = runTwoSlash(code, "ts", {
        defaultOptions: {
          noErrors: true,
          noErrorValidation: true,
        },
      });
      const html = renderCodeToHTML(
        twoslash.code,
        "ts",
        ["twoslash"],
        { themeName: "monokai" },
        highlighter,
        twoslash
      );

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
