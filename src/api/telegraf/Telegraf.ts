import { Context, Telegraf } from "telegraf";
import * as E from "fp-ts/Either";
import * as ErrorWithCause from "../../error/ErrorWithCause";
import { parseErrorOrUnknownError } from "../../error/parseError";
import { Update } from "telegraf/typings/core/types/typegram";

type TelegrafCtorParams = ConstructorParameters<typeof Telegraf>;
export type TelegrafOptions = TelegrafCtorParams[1];
export type TelegrafToken = TelegrafCtorParams[0];
export type Bot = Telegraf<Context<Update>>;

export enum ErrorType {
  INIT = "INIT::TelegrafErrorType",
}

export function init(options: TelegrafOptions) {
  return function initWithOptions(botToken: TelegrafToken) {
    return E.tryCatch(
      () => new Telegraf(botToken, options),
      ErrorWithCause.create({
        type: ErrorType.INIT,
        context: { options, botToken },
      })(parseErrorOrUnknownError)
    );
  };
}
