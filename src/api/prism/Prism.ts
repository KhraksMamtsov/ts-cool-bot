import prism from "prismjs";
import * as E from "fp-ts/Either";
import * as EWC from "../../error/ErrorWithCause";
import { getErrorOrUnknownError } from "../../error/parseError";

export enum ErrorType {
  HIGHLIGHT = "HIGHLIGHT::PrismErrorType",
}

export function highlight(language: string) {
  return function highlightLanguage(html: string) {
    return E.tryCatch(
      () => prism.highlight(html, prism.languages[language]!, language),
      EWC.create({
        type: ErrorType.HIGHLIGHT,
        context: {
          language,
          html,
        },
      })(getErrorOrUnknownError)
    );
  };
}
