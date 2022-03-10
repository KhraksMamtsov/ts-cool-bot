import { MessageEntity as _MessageEntity } from "telegraf/typings/core/types/typegram";
import { getSubstring } from "../../libs/string/string";

export type MessageEntity = _MessageEntity;

export function is<T extends MessageEntity["type"]>(
	type: T,
) {
	return function isOfType(
		messageEntity: MessageEntity,
	): messageEntity is { type: T } & MessageEntity {
		return messageEntity.type === type;
	};
}

export const isPre = is("pre");

export function extract({ offset, length }: MessageEntity) {
	return function extractWithMessageEntity(source: string) {
		return source.substring(offset, offset + length);
	};
}
