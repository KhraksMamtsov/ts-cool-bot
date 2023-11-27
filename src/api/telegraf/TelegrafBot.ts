import { Chunk, Data, Effect, Stream } from "effect";
import * as TF from "telegraf/filters";
import {
  ExtraEditMessageText,
  ExtraReplyMessage,
} from "telegraf/typings/telegram-types";
import { Message, Update } from "telegraf/typings/core/types/typegram";
import * as _Telegraf from "telegraf";

export type UpdateTextContext = _Telegraf.Context<Update>;
export type _Bot = _Telegraf.Telegraf<UpdateTextContext>;

export enum TelegrafBotPayload {
  TEXT = "TEXT::TelegrafBotPayload",
  EDITED_TEXT = "EDITED_TEXT::TelegrafBotPayload",
}

export class TextPayload extends Data.TaggedClass(TelegrafBotPayload.TEXT)<{
  readonly message: Update.New & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
  readonly editMessageText: ReturnType<typeof editMessageText>;
}> {}

export class EditedTextPayload extends Data.TaggedClass(
  TelegrafBotPayload.EDITED_TEXT,
)<{
  readonly message: Update.Edited & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
  readonly editMessageText: ReturnType<typeof editMessageText>;
}> {}

export type TelegrafBot = ReturnType<typeof makeBot>;
export const makeBot = (bot: _Bot) => {
  const text$ = Stream.async<never, never, TextPayload>((emit) => {
    bot.on(TF.message("text"), async (context, next) => {
      await emit(
        Effect.succeed(
          Chunk.of(
            new TextPayload({
              message: context.message,
              replyWithMarkdown: replyWithMarkdown(context),
              editMessageText: editMessageText(context),
            }),
          ),
        ),
      );
      return await next();
    });
  });

  const editedText$ = Stream.async<never, never, EditedTextPayload>((emit) => {
    bot.on(TF.editedMessage("text"), async (context, next) => {
      await emit(
        Effect.succeed(
          Chunk.of(
            new EditedTextPayload({
              message: context.update.edited_message,
              replyWithMarkdown: replyWithMarkdown(context),
              editMessageText: editMessageText(context),
            }),
          ),
        ),
      );
      return await next();
    });
  });

  return {
    text$,
    editedText$,
  } as const;
};

export enum CtxErrorType {
  REPLY_WITH_MARKDOWN = "REPLY_WITH_MARKDOWN::TelegrafCtxErrorType",
  EDIT_MESSAGE_TEXT = "EDIT_MESSAGE_TEXT::TelegrafCtxErrorType",
}

class TelegrafCtxReplyWithMarkdownError extends Data.TaggedError(
  CtxErrorType.REPLY_WITH_MARKDOWN,
)<{
  readonly error: unknown;
  readonly markdown: string;
  readonly extra: ExtraReplyMessage;
}> {}
class TelegrafCtxEditMessageTextError extends Data.TaggedError(
  CtxErrorType.EDIT_MESSAGE_TEXT,
)<{
  readonly error: unknown;
  readonly markdown: string;
  readonly extra: ExtraEditMessageText;
}> {}

export const replyWithMarkdown =
  (context: UpdateTextContext) =>
  (markdown: string, extra: ExtraReplyMessage) =>
    Effect.tryPromise({
      try: () => context.replyWithMarkdownV2(markdown, extra),
      catch: (error) =>
        new TelegrafCtxReplyWithMarkdownError({ error, markdown, extra }),
    });

export const editMessageText =
  (context: UpdateTextContext) =>
  (markdown: string, messageId: number, extra: ExtraEditMessageText) =>
    Effect.tryPromise({
      try: () =>
        context.telegram.editMessageText(
          context.message?.chat?.id,
          messageId,
          undefined,
          markdown,
          extra,
        ),
      catch: (error) =>
        new TelegrafCtxEditMessageTextError({ error, markdown, extra }),
    });
