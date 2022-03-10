import {
	twoslasher,
	TwoSlashOptions,
	TwoSlashReturn,
	TwoslashError,
} from "@typescript/twoslash";
import * as s from "fp-ts/string";
import * as n from "fp-ts/number";
import * as Ord from "fp-ts/Ord";
import * as Eq from "fp-ts/Eq";
import * as E from "fp-ts/Either";
import {
	flow,
	identity,
	pipe,
	apply,
	hole,
	constant,
} from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as RNEA from "fp-ts/lib/ReadonlyNonEmptyArray";
import * as ErrorWithCause from "../../error/ErrorWithCause";
import { parseWithUnknown } from "../../error/parseError";
import * as D from "io-ts/Decoder";

export const NumberFromString: D.Decoder<unknown, number> =
	pipe(
		D.string,
		D.parse((s) => {
			const n = parseFloat(s);
			return isNaN(n)
				? D.failure(s, "NumberFromString")
				: D.success(n);
		}),
	);

export type Options = TwoSlashOptions;
export type Result = TwoSlashReturn;

export enum ErrorType {
	TWOSLASH_UNKNOWN = "TWOSLASH_UNKNOWN::TwoslashErrorType",
	TWOSLASH = "TWOSLASH::TwoslashErrorType",
	CREATION = "CREATION::TwoslashErrorType",
}

function isTwoslashError(
	error: Error,
): error is TwoslashError {
	return error instanceof TwoslashError;
}

// function instanceOf<A, B extends A>(klass: B) {
//     return function isInstanceOfWithKlass(instance: A): instance is B {
//         return instance instanceof klass;
//     }
// }

export function create(options: TwoSlashOptions) {
	return function createWithOptions(code: string) {
		return E.tryCatch(
			() => twoslasher(code, "tsx", options),
			flow(
				ErrorWithCause.create({
					type: ErrorType.CREATION,
					context: {
						options,
						code,
					},
				})(
					flow(
						parseWithUnknown(
							flow(
								E.fromPredicate(
									isTwoslashError,
									ErrorWithCause.create({
										type: ErrorType.TWOSLASH_UNKNOWN,
									})(identity),
								),
								E.map(
									ErrorWithCause.create({
										type: ErrorType.TWOSLASH,
									})(identity),
								),
								E.toUnion,
							),
						),
					),
				),
			),
		);
	};
}

type Line = ReadonlyArray<string>;

function lineLength(line: Line, joiner: string) {
	const joinersLength = (line.length - 1) * joiner.length;
	return (
		joinersLength +
		pipe(
			//
			line,
			RA.foldMap(n.MonoidSum)(s.size),
		)
	);
}

const JOINER = " ";
const SPLITTER = /\s+/;

export function wrapLine({
	maxWidth,
	splitter = SPLITTER,
	joiner = JOINER,
}: {
	maxWidth: number;
	splitter?: RegExp;
	joiner?: string;
}) {
	return function wrapLineWithWidth(line: string) {
		return pipe(
			line,
			s.split(splitter),
			RA.filter((x) => !!x.length),

			RA.reduce<string, ReadonlyArray<Line>>(
				[],
				(acc, currentWord) => {
					const lastLine = acc[acc.length - 1];
					if (!lastLine) {
						return [[currentWord]];
					} else {
						if (
							lineLength(lastLine, joiner) +
								joiner.length +
								currentWord.length >
							maxWidth
						) {
							return [...acc, [currentWord]];
						} else {
							const lineWithCurrentWord = pipe(
								lastLine,
								RNEA.fromReadonlyArray,
								O.match(
									() => RNEA.of(currentWord),
									flow(RA.append(currentWord)),
								),
							);

							return [
								...acc.slice(0, -1),
								lineWithCurrentWord,
							];
						}
					}
				},
			),
			RA.map((line) => line.join(joiner)),
		);
	};
}

const TEXT_SPLITTER = /\n/;
const TEXT_JOINER = "\n";
const LINE_PREFIX = "// ";
type WrapTextOptions = {
	maxWidth: number;
	splitter?: RegExp;
	joiner?: string;
	linePrefix?: string;
};
export function wrapText({
	maxWidth,
	linePrefix = LINE_PREFIX,
	splitter = TEXT_SPLITTER,
}: WrapTextOptions) {
	return function wrapTextWithWidth(text: string) {
		return pipe(
			text,
			s.split(splitter),
			RNEA.filter((line) => !!line.length),
			O.map(
				flow(
					RNEA.map(
						flow(
							wrapLine({
								maxWidth: maxWidth - linePrefix.length,
							}),
							RA.map((x) => linePrefix + x),
						),
					),
					RA.flatten,
				),
			),
		);
	};
}

type TwoSlashReturnError = TwoSlashReturn["errors"][number];

export type Override<
	INPUT,
	OVERRIDES extends Partial<Record<keyof INPUT, any>>,
> = Omit<INPUT, keyof OVERRIDES> & OVERRIDES;

type TwoSlashReturnLineError = Override<
	TwoSlashReturnError,
	{
		line: number;
		start: number;
	}
>;

const flowOrd = Ord.contramap<
	readonly [line: number, start: number],
	TwoSlashReturnLineError
>((x) => [x.line, x.start])(Ord.tuple(n.Ord, n.Ord));

const eqLine = Eq.contramap<
	number,
	TwoSlashReturnLineError
>((x) => x.line)(n.Ord);

function isLineError(
	error: TwoSlashReturnError,
): error is TwoSlashReturnLineError {
	return [error.line, error.start].every(
		(x) => x !== undefined,
	);
}

export function inlineErrors({
	code,
	errors,
}: TwoSlashReturn) {
	const Text = code.split("\n");

	return pipe(
		errors,
		RA.map((error) =>
			pipe(error, E.fromPredicate(isLineError, identity)),
		),
		RA.separate,
		({ right }) => {
			return pipe(
				//
				Text,
				inlineLineErrors(right, 55),
				// appendErrors(left),
			);
		},
	);
}

const group = <A>({ equals }: Eq.Eq<A>) => {
	return RNEA.chop((as: RNEA.ReadonlyNonEmptyArray<A>) => {
		const { init, rest } = pipe(
			as,
			RA.spanLeft((a) => equals(a, RNEA.head(as))),
		);
		return [init, rest];
	});
};

function inlineLineErrors(
	errors: ReadonlyArray<TwoSlashReturnLineError>,
	maxWidth: number,
) {
	return function inlineLineErrorsWithErrors(
		text: ReadonlyArray<string>,
	) {
		console.log(text);
		console.log(errors);
		const asd = pipe(
			errors,
			RNEA.fromReadonlyArray,
			O.map(
				flow(
					RNEA.sort(flowOrd),
					RNEA.reduce(
						[] as ReadonlyArray<
							readonly [
								commentText: ReadonlyArray<string>,
								offset: number,
							]
						>,
						(acc, error) => {
							console.log("error: ", error);
							return pipe(
								`(${error.code}) ${error.renderedMessage}`,
								wrapText({ maxWidth }),
								O.map((commentText) => {
									return pipe(
										RA.last(acc),
										O.match(
											() =>
												[
													[commentText, error.line + 1],
												] as const,
											([_, lastCommentOffset]) => {
												return pipe(
													acc,
													RA.append([
														commentText,
														lastCommentOffset +
															commentText.length -
															1,
													] as const),
												);
											},
										),
									);
								}),
								O.getOrElseW(() => []),
								(xxx) => xxx,
							);
						},
					),
					(xxx) => {
						console.log(123, xxx);
						return xxx;
					},
					RA.reduce(
						O.some(text),
						(t, [commentText, offset]) => {
							return pipe(
								t,
								O.chain(
									flow(
										RA.insertAt(
											offset,
											commentText.join("\n"),
										),
									),
								),
							);
						},
					),
				),
			),
		);

		return asd;
	};
}

// function appendErrors(
// 	errors: ReadonlyArray<TwoSlashReturnError>,
// ) {
// 	return function appendErrorsWithErrors(
// 		text: string[],
// 	): string[] {
// 		return [];
// 	};
// }
