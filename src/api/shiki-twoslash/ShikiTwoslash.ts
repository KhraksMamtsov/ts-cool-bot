import {
  renderCodeToHTML,
  runTwoSlash,
  createShikiHighlighter,
} from "shiki-twoslash";
import * as TE from "fp-ts/TaskEither";

export enum ErrorType {
  CREATION = "CREATION::ShikiTwoslashErrorType",
  TWOSLASH_UNKNOWN = "TWOSLASH_UNKNOWN::ShikiTwoslashErrorType",
  TWOSLASH = "TWOSLASH::ShikiTwoslashErrorType",
  RENDER_HTML = "RENDER_HTML::ShikiTwoslashErrorType",
}

export function getHtml(code: string) {
  return TE.tryCatch(
    async () => {
      const highlighter = await createShikiHighlighter({ theme: "dark-plus" });
      const twoslash = runTwoSlash(code, "ts", {});
      const html = renderCodeToHTML(
        twoslash.code,
        "ts",
        ["twoslash"],
        { themeName: "dark-plus" },
        highlighter,
        twoslash
      );

      return html;
    },
    () => {}
  );
}
