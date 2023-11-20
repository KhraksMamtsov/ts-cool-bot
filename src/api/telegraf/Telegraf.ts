import * as _Telegraf from "telegraf";
import { useNewReplies } from "telegraf/future";
import * as TF from "telegraf/filters";
import { Update, Message } from "telegraf/typings/core/types/typegram";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";
import { Effect, Context, pipe, Layer, Data, Stream, Chunk } from "effect";
export enum ErrorType {
  INIT = "INIT::TelegrafErrorType",
  LAUNCH = "LAUNCH::TelegrafErrorType",
}

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

class TelegrafInitError extends Data.TaggedError(ErrorType.INIT)<{
  readonly options: TelegrafOptionsService;
}> {}
class TelegrafLaunchError extends Data.TaggedError(ErrorType.LAUNCH)<{
  readonly cause: unknown;
}> {}

type TelegrafCtorParams = ConstructorParameters<typeof _Telegraf.Telegraf>;
export type _TelegrafOptions = Exclude<TelegrafCtorParams[1], undefined>;
export type TelegrafToken = TelegrafCtorParams[0];
export type UpdateTextContext = _Telegraf.Context<Update>;
export type _Bot = _Telegraf.Telegraf<UpdateTextContext>;
interface TelegrafOptions {
  readonly _: unique symbol;
}
export interface TelegrafOptionsService {
  readonly options: _TelegrafOptions;
  readonly botToken: TelegrafToken;
}
export const TelegrafOptions = Context.Tag<
  TelegrafOptions,
  TelegrafOptionsService
>();

export const options = (options: TelegrafOptionsService) =>
  Layer.succeed(TelegrafOptions, TelegrafOptions.of(options));

const makeLive = pipe(
  TelegrafOptions,
  Effect.map((x) => {
    const init = () =>
      pipe(
        Effect.try({
          try: () => new _Telegraf.Telegraf(x.botToken, x.options),
          catch: () => new TelegrafInitError({ options: x }),
        }),
        Effect.map((x) => x.use(useNewReplies())),
        Effect.map((x) => ({
          bot: makeBot(x),
          launch: launch(x),
        })),
      );

    const launch =
      (bot: _Bot) =>
      <E, A>(effect: Effect.Effect<never, E, A>) =>
        pipe(
          //
          Effect.runPromiseExit(effect),
          () =>
            Effect.tryPromise({
              try: () => bot.launch(),
              catch: (cause) => new TelegrafLaunchError({ cause }),
            }),
        );

    return { init } as const;
  }),
);

interface Telegraf {
  readonly _: unique symbol;
}
export interface TelegrafService
  extends Effect.Effect.Success<typeof makeLive> {}
export const Telegraf = Context.Tag<Telegraf, TelegrafService>();

export const TelegrafLive = Layer.effect(Telegraf, makeLive);

export enum Payload {
  TEXT = "TEXT::Payload",
  EDITED_TEXT = "EDITED_TEXT::Payload",
}

export class TextPayload extends Data.TaggedClass(Payload.TEXT)<{
  readonly message: Update.New & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
}> {}

export class EditedTextPayload extends Data.TaggedClass(Payload.EDITED_TEXT)<{
  readonly message: Update.Edited & Update.NonChannel & Message.TextMessage;
  readonly replyWithMarkdown: ReturnType<typeof replyWithMarkdown>;
}> {}

const replyWithMarkdown =
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

export type Bot = Omit<ReturnType<typeof makeBot>, "bot">;

const makeBot = (bot: _Bot) => {
  const text$ = Stream.async<never, never, TextPayload>((emit) => {
    bot.on(TF.message("text"), async (context, next) => {
      console.dir(context.message, {
        depth: 1000,
      });
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
      console.dir(context.update, {
        depth: 1000,
      });
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
