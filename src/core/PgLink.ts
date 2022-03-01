import * as Reg from "fp-ts-contrib/RegExp";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { not } from "fp-ts/Predicate";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import * as String from "fp-ts/string";
import { decompressFromEncodedURIComponent } from "lz-string";
import * as TG from "telegraf/typings/core/types/typegram";
import * as MessageEntity from "./MessageEntity";

//#region Model

const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]*)?(?:\&\w+=[^\s#&]*)*)#code\/([\w\-%+_]+={0,4})/;

type PgContent = string & { readonly _: unique symbol };

//#endregion

export const parseLink =
  (text: string) =>
  (entity: TG.MessageEntity): O.Option<PgContent> => {
    const extractLink = (entity: TG.MessageEntity) =>
      MessageEntity.extractText(entity)(text);

    const extractLinkContent = (str: string) =>
      pipe(
        str,
        Reg.match(PLAYGROUND_REGEX),
        O.map((matches) => matches[2]),
        O.chain(O.fromNullable),
        O.filter(not(String.isEmpty))
      );

    const decodeLinkContent = (raw: string) =>
      pipe(
        raw,
        decompressFromEncodedURIComponent,
        O.fromNullable,
        O.map((t) => t as PgContent)
      );

    return pipe(
      entity,
      O.fromPredicate(MessageEntity.isUrlEntity),
      O.map(extractLink),
      O.chain(extractLinkContent),
      O.chain(decodeLinkContent)
    );
  };

export const parseLinks = (
  entities: TG.MessageEntity[] = [],
  text: string
): O.Option<RNEA.ReadonlyNonEmptyArray<PgContent>> => {
  return pipe(
    entities,
    RA.map(parseLink(text)),
    RA.compact,
    RNEA.fromReadonlyArray
  );
};
