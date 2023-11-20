import { Chunk, Data, Effect, Stream } from "effect";
import * as TF from "telegraf/filters";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";
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
}> {}

export class EditedTextPayload extends Data.TaggedClass(
  TelegrafBotPayload.EDITED_TEXT,
)<{
  readonly message: Update.Edited & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
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
}

class TelegrafCtxReplyWithMarkdownError extends Data.TaggedError(
  CtxErrorType.REPLY_WITH_MARKDOWN,
)<{
  readonly error: unknown;
  readonly markdown: string;
  readonly extra: ExtraReplyMessage;
}> {}
export const replyWithMarkdown =
  (ctx: UpdateTextContext) => (markdown: string, extra: ExtraReplyMessage) =>
    Effect.tryPromise({
      try: () => ctx.replyWithMarkdownV2(markdown, extra),
      catch: (error) =>
        new TelegrafCtxReplyWithMarkdownError({
          error,
          markdown,
          extra,
        }),
    });
