import {
  Data,
  Match,
  pipe,
  Option as O,
  String as S,
  ReadonlyArray as RA,
  flow,
} from "effect";
import * as LzString from "../../api/ls-string/LzString";
import * as String from "../../libs/string/string";

import { Message, MessageEntity } from "telegraf/typings/core/types/typegram";

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
  CodeSourceType.COMPRESSED_URL,
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
        O.flatMap(RA.get(3)),
        O.flatMap(flow(LzString.decompress, O.getRight, O.flatten)),
      ),
  }),
);

const discriminator = "type" as const;
type discriminator = typeof discriminator;

type Help<T, D extends keyof T> = T[D] extends infer V
  ? V extends V
    ? T & Record<D, V>
    : T
  : T;

const fromText = (text: string) =>
  pipe(
    Match.type<Help<MessageEntity, discriminator>>(),
    Match.discriminator(discriminator)("url", (url) =>
      pipe(
        url,
        String.getSubstringFrom(text),
        (compressedUrl) => new CompressedUrl({ compressedUrl }),
        O.some,
      ),
    ),
    Match.discriminator(discriminator)("pre", (pre) => {
      if (
        ![undefined, "ts", "typescript", "js", "javascript"].includes(
          pre.language,
        )
      ) {
        return O.none();
      }
      return pipe(
        pre,
        String.getSubstringFrom(text),
        (rawCode) => new RawCode({ rawCode }),
        O.some,
      );
    }),
    Match.discriminator(discriminator)("text_link", (text_link) =>
      pipe(new CompressedUrl({ compressedUrl: text_link.url }), O.some),
    ),
    Match.orElse((_) => O.none()),
  );

export const fromTextMessage = (textPayload: Message.TextMessage) => {
  const fromTextFor = fromText(textPayload.text);

  return pipe(
    textPayload.entities,
    O.fromNullable,
    O.flatMap(
      flow(
        RA.filterMap(fromTextFor),
        RA.match({
          onEmpty: O.none,
          onNonEmpty: O.some,
        }),
      ),
    ),
  );
};
