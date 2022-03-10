import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import * as RA from "fp-ts/ReadonlyArray";
import * as RgX from "fp-ts-contrib/RegExp";
import { pipe, apply, flow } from "fp-ts/lib/function";
import { Message as _Message } from "telegraf/typings/core/types/typegram";
import * as MessageEntity from "../MessageEntity/MessageEntity";

export type Message = _Message.TextMessage;

const CODEBLOCK_REGEXP = /^(?:(?:j|t)sx?|(?:java|type)script)?\n([\s\S]+)$/i;
const CODEBLOCK_MATCH_GROUP = 1;
const matchTsCodeblock = RgX.match(CODEBLOCK_REGEXP);

export function getCodeblocks(message: Message) {
  return pipe(
    O.fromNullable(message.entities),
    O.chain(
      flow(
        RA.filter(MessageEntity.isPre),
        RA.map(
          flow(
            //
            MessageEntity.extract,
            apply(message.text),
            matchTsCodeblock
          )
        ),
        O.traverseArray(O.chain(RA.lookup(CODEBLOCK_MATCH_GROUP))),
        O.chain(RNEA.fromReadonlyArray)
      )
    )
  );
}
