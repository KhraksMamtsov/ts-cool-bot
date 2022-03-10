import * as RegExp from "fp-ts-contrib/lib/RegExp";
import { constant, pipe } from "fp-ts/lib/function";
import * as n from "fp-ts/lib/number";
import * as s from "fp-ts/lib/string";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";

export type LineContent =
	RNEA.ReadonlyNonEmptyArray<string>;

export const EmptyLineContent = RNEA.of("");

export function createLineContent(separator: RegExp) {
	return function createWithSeparator(source: string) {
		return pipe(
			source,
			RegExp.split(separator),
			RA.filter((x) => !!x.length),
			RNEA.fromReadonlyArray,
			O.getOrElse(constant(EmptyLineContent)),
		);
	};
}

export type Line = Readonly<{
	content: LineContent;
	options: Options;
}>;

export type Options = Readonly<{
	separator: string;
}>;

export const empty = create({ separator: "" })(/./)("");

export function size({ content, options }: Line) {
	const joinersLength =
		(content.length - 1) * options.separator.length;
	return (
		joinersLength +
		// prefix.length +
		pipe(content, RNEA.foldMap(n.SemigroupSum)(s.size))
	);
}

export function addToLine(word: string) {
	return function addToLineWithContent(line: Line) {
		return pipe(
			line.content,
			RNEA.concat(RNEA.of(word)),
			fromLineContent(line.options),
		);
	};
}

export function fromLineContent(options: Options) {
	return function fromLineContentWithOptions(
		lineContent: LineContent,
	): Line {
		return {
			content: lineContent,
			options,
		};
	};
}

export function create(options: Options) {
	return function createWithOptions(separator: RegExp) {
		return function createWithOptionsAndSeparator(
			source: string,
		): Line {
			return {
				content: createLineContent(separator)(source),
				options,
			};
		};
	};
}

export function show(line: Line) {
	return line.content.join(line.options.separator);
}
