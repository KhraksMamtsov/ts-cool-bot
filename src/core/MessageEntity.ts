import * as TG from "telegraf/typings/core/types/typegram";
import * as String from "fp-ts/string";

export type MessageEntity = TG.MessageEntity;

export const extractText = (entity: TG.MessageEntity) => (text: string) =>
  String.slice(entity.offset, entity.offset + entity.length)(text);

export const isUrlEntity = (entity: TG.MessageEntity) => entity.type === "url";
