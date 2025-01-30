import {
  Data,
  Match,
  pipe,
  Option as O,
  String as S,
  Array,
  flow,
} from "effect";
import * as LzString from "../../api/ls-string/LzString.js";
import * as String from "../../libs/string/string.js";

import type { Message, MessageEntity } from "@telegraf/types";
import type { TextPayload } from "../../api/telegraf/TelegrafBot.js";
import {
  CaptionPayload,
  TelegrafBotPayload,
} from "../../api/telegraf/TelegrafBot.js";

// https://github.com/typescript-community/community-bot/blob/master/src/util/codeBlocks.ts#L7C2-L7C2
const PLAYGROUND_REGEX =
  /<?(https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:[a-z]{2,3}\/)?(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]*)?(?:\&\w+=[^\s#&]*)*)#code\/([\w\-%+_]+={0,4}))>?/;

export enum CodeSourceType {
  RAW = "RAW::CodeSourceType",
  COMPRESSED_URL = "COMPRESSED_URL::CodeSourceType",
}
export class RawCode extends Data.TaggedClass(CodeSourceType.RAW)<{
  readonly rawCode: string;
}> {}
export class CompressedUrl extends Data.TaggedClass(
  CodeSourceType.COMPRESSED_URL
)<{
  readonly compressedUrl: string;
}> {}

export type CodeSource = RawCode | CompressedUrl;

export const code = pipe(
  Match.type<CodeSource>(),
  Match.tagsExhaustive({
    [CodeSourceType.RAW]: (x) => O.some(x.rawCode),
    [CodeSourceType.COMPRESSED_URL]: (x) =>
      pipe(
        x.compressedUrl,
        S.match(PLAYGROUND_REGEX),
        O.flatMap(Array.get(3)),
        O.flatMap(flow(LzString.decompress, O.getRight, O.flatten))
      ),
  })
);

const discriminator = "type" as const;
type discriminator = typeof discriminator;

type Help<T, D extends keyof T> = T[D] extends infer V
  ? V extends V
    ? T & Record<D, V>
    : T
  : T;

const matchType = Match.discriminator(discriminator);
const fromText = (text: string) =>
  pipe(
    Match.type<Help<MessageEntity, discriminator>>(),
    matchType("url", (url) =>
      pipe(
        url,
        String.getSubstringFrom(text),
        (compressedUrl) => new CompressedUrl({ compressedUrl }),
        O.some
      )
    ),
    matchType("pre", (pre) => {
      return ![undefined, "ts", "typescript", "js", "javascript"].includes(
        pre.language?.toLowerCase()
      )
        ? O.none()
        : pipe(
            pre,
            String.getSubstringFrom(text),
            (rawCode) => new RawCode({ rawCode }),
            O.some
          );
    }),
    matchType("text_link", (text_link) =>
      pipe(new CompressedUrl({ compressedUrl: text_link.url }), O.some)
    ),
    Match.orElse((_) => O.none())
  );

export const fromPayload = (payload: TextPayload | CaptionPayload) => {
  const { source, entities } =
    payload._tag === TelegrafBotPayload.TEXT
      ? {
          source: payload.message.text,
          entities: payload.message.entities,
        }
      : {
          source: payload.message.caption ?? "",
          entities: payload.message.caption_entities,
        };
  const fromSourceFor = fromText(source);

  return pipe(
    entities,
    O.fromNullable,
    O.flatMap(
      flow(
        Array.filterMap(fromSourceFor),
        Array.match({
          onEmpty: O.none,
          onNonEmpty: O.some,
        })
      )
    )
  );
};
