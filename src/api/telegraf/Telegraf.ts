import { Telegraf } from "telegraf";
import * as E from "fp-ts/Either";
import { create, ErrorWithCause } from "../../error/ErrorWithCause";
import { getErrorOrUnknownError } from "../../error/parseError";

type TelegrafCtorParams = ConstructorParameters<typeof Telegraf>;
export type TelegrafOptions = TelegrafCtorParams[1];
export type TelegrafToken = TelegrafCtorParams[0];

export enum ErrorType {
  INIT = "INIT::TelegrafErrorType",
}

export function init(options: TelegrafOptions) {
  return function initWithOptions(botToken: TelegrafToken) {
    return E.tryCatch(
      () => new Telegraf(botToken, options),
      create({
        type: ErrorType.INIT,
        context: { options, botToken },
      })(getErrorOrUnknownError)
    );
  };
}
