import { Chunk, Data, Effect, Stream } from "effect";
import * as TF from "telegraf/filters";
import type { Convenience } from "telegraf/types";
import type { Message, Update } from "@telegraf/types";
import * as _Telegraf from "telegraf";
import * as Telegraf from "./Telegraf.js";

export type UpdateTextContext = _Telegraf.Context<Update>;

export enum TelegrafBotPayload {
  TEXT = "TEXT::TelegrafBotPayload",
  CAPTION = "CAPTION::TelegrafBotPayload",
  EDITED_TEXT = "EDITED_TEXT::TelegrafBotPayload",
  HELP = "HELP::TelegrafBotPayload",
}

export class TextPayload extends Data.TaggedClass(TelegrafBotPayload.TEXT)<{
  readonly message: Update.New & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
  readonly editMessageText: ReturnType<typeof editMessageText>;
}> {}

export class CaptionPayload extends Data.TaggedClass(
  TelegrafBotPayload.CAPTION
)<{
  readonly message: Update.New & Update.NonChannel & Message.CaptionableMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
  readonly editMessageText: ReturnType<typeof editMessageText>;
}> {}

export class HelpPayload extends Data.TaggedClass(TelegrafBotPayload.HELP)<{
  readonly message: Update.New & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
  readonly editMessageText: ReturnType<typeof editMessageText>;
}> {}

export class EditedTextPayload extends Data.TaggedClass(
  TelegrafBotPayload.EDITED_TEXT
)<{
  readonly message: Update.Edited & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
  readonly editMessageText: ReturnType<typeof editMessageText>;
}> {}

export class TelegrafBot extends Effect.Service<TelegrafBot>()(
  "@telegraf/TelegrafClient",
  {
    effect: Effect.gen(function* () {
      const TelegrafClient = yield* Telegraf.Telegraf;
      console.log("TelegrafBot");
      const text$ = Stream.async<TextPayload>((emit) => {
        console.log("text$");
        TelegrafClient.on(TF.message("text"), async (context, next) => {
          console.log(context.message);
          await emit.single(
            new TextPayload({
              message: context.message,
              replyWithMarkdown: replyWithMarkdown(context),
              editMessageText: editMessageText(context),
            })
          );
          return await next();
        });
      });
      const caption$ = Stream.asyncPush<CaptionPayload>((emit) =>
        Effect.sync(() => {
          console.log(222);
          TelegrafClient.on(TF.message("caption"), async (context, next) => {
            await emit.single(
              new CaptionPayload({
                message: context.message,
                replyWithMarkdown: replyWithMarkdown(context),
                editMessageText: editMessageText(context),
              })
            );
            return await next();
          });
        })
      );
      const help$ = Stream.async<HelpPayload>((emit) => {
        TelegrafClient.help(async (context, next) => {
          await emit.single(
            new HelpPayload({
              message: context.message,
              replyWithMarkdown: replyWithMarkdown(context),
              editMessageText: editMessageText(context),
            })
          );

          return await next();
        });
      });

      const editedText$ = Stream.async<EditedTextPayload>((emit) => {
        TelegrafClient.on(TF.editedMessage("text"), async (context, next) => {
          await emit.single(
            new EditedTextPayload({
              message: context.update.edited_message,
              replyWithMarkdown: replyWithMarkdown(context),
              editMessageText: editMessageText(context),
            })
          );
          return await next();
        });
      });

      return {
        text$,
        caption$,
        editedText$,
        help$,
      } as const;
    }),
  }
) {}

export enum CtxErrorType {
  REPLY_WITH_MARKDOWN = "REPLY_WITH_MARKDOWN::TelegrafCtxErrorType",
  EDIT_MESSAGE_TEXT = "EDIT_MESSAGE_TEXT::TelegrafCtxErrorType",
}

class TelegrafCtxReplyWithMarkdownError extends Data.TaggedError(
  CtxErrorType.REPLY_WITH_MARKDOWN
)<{
  readonly error: unknown;
  readonly markdown: string;
  readonly extra: Convenience.ExtraReplyMessage;
}> {}
class TelegrafCtxEditMessageTextError extends Data.TaggedError(
  CtxErrorType.EDIT_MESSAGE_TEXT
)<{
  readonly error: unknown;
  readonly markdown: string;
  readonly extra: Convenience.ExtraEditMessageText;
}> {}

export const replyWithMarkdown =
  (context: UpdateTextContext) =>
  (markdown: string, extra: Convenience.ExtraReplyMessage) =>
    Effect.tryPromise({
      try: () => context.replyWithMarkdownV2(markdown, extra),
      catch: (error) =>
        new TelegrafCtxReplyWithMarkdownError({ error, markdown, extra }),
    });

export const editMessageText =
  (context: UpdateTextContext) =>
  (
    markdown: string,
    messageId: number,
    extra: Convenience.ExtraEditMessageText
  ) =>
    Effect.tryPromise({
      try: () =>
        context.telegram.editMessageText(
          context.message?.chat?.id,
          messageId,
          undefined,
          markdown,
          extra
        ),
      catch: (error) =>
        new TelegrafCtxEditMessageTextError({ error, markdown, extra }),
    });
