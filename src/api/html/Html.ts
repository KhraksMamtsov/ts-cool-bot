import nodeHtmlToImage from "node-html-to-image";
import { Options } from "node-html-to-image/dist/types";
import * as TE from "fp-ts/TaskEither";
import * as EWC from "../../error/ErrorWithCause";
import { getErrorOrUnknownError } from "../../error/parseError";

export enum ErrorType {
  TO_IMAGE = "TO_IMAGE::HtmlErrorType",
}

export type ToImageOptions = Omit<Options, "html" | "output" | "content">;

export function toImage(options: ToImageOptions) {
  return function toImageWithOptions(html: string) {
    return TE.tryCatch(
      async () => await nodeHtmlToImage({ ...options, html }),
      EWC.create({
        type: ErrorType.TO_IMAGE,
        context: { options, html },
      })(getErrorOrUnknownError)
    );
  };
}
