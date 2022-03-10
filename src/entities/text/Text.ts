import { constant, hole, pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
import * as O from "fp-ts/Option";
import * as Line from "./line/Line";
import { pipeline } from "stream";

export type Text = Options &
	Readonly<{
		content: RNEA.ReadonlyNonEmptyArray<Line.Line>;
	}>;

export type Options = Readonly<{
	maxWidth: number;
	prefix: string;
	separator: string;
}>;

export function show(text: Text) {
	return pipe(text.content, RNEA.map(Line.show)).join(
		text.separator,
	);
}

export function fromLine(options: Options) {
	function fromLineWithOptions(line: Line.Line): Text {
		// string[] => Line[]
		const asd = pipe(
			line.content,
			RNEA.chop((lineContent) => {
				function getLine(maxW: number) {
					function tryAdd(
						line: RNEA.ReadonlyNonEmptyArray<string>,
						words: RNEA.ReadonlyNonEmptyArray<string>,
					): [
						line: RNEA.ReadonlyNonEmptyArray<string>,
						restWords: ReadonlyArray<string>,
					] {
						return pipe(
							words,
							RNEA.matchLeft((head, tail) => {
								const newLine = pipe(line, RA.append(head));
								return pipe(
									tail,
									RNEA.fromReadonlyArray,
									O.match(
										() => {
											if (newLine.length > maxW) {
												return [line, [head, ...tail]];
											} else {
												return [newLine, tail];
											}
										},
										(nonEmptyTail) => {
											if (newLine.length > maxW) {
												return [
													line,
													[head, ...nonEmptyTail],
												];
											} else {
												return tryAdd(
													newLine,
													nonEmptyTail,
												);
											}
										},
									),
								);
							}),
						);
					}

					function getLineLessWhenWidth(
						x: Line.LineContent,
						prev: Line.Line,
					) {
						const asd = pipe(
							x,
							RNEA.matchLeft(function qqq(head, tail) {
								const headLine = pipe(
									RNEA.of(head),
									Line.fromLineContent(line.options),
								);

								return pipe(
									tail,
									RNEA.fromReadonlyArray,
									O.match(
										constant(headLine),
										([newHead, ...newTail]) => {
											// getLineLessWhenWidth x
											// [x:xs] ->
											const newLine = pipe(
												headLine,
												Line.addToLine(newHead),
											);
											if (
												Line.size(newLine) +
													options.prefix.length >
												maxW
											) {
												return headLine;
											} else {
												pipe(newLine, Line.addToLine());

												return headLine;
											}

											// return hole();
										},
									),
									//
								);
							}),
						);
						return asd;
					}
				}

				return hole();
			}),

			(x) => x,
			RNEA.map(Line.fromLineContent(line.options)),
			(xxx) => xxx,
			// RA.reduce<string, >(
			// 	[],
			// 	(acc, currentWord) => {
			// 		const lastLine = acc[acc.length - 1];
			// 		if (!lastLine) {
			// 			return [[currentWord]];
			// 		} else {
			// 			if (
			// 				lineLength(lastLine, joiner) +
			// 					joiner.length +
			// 					currentWord.length >
			// 				maxWidth
			// 			) {
			// 				return [...acc, [currentWord]];
			// 			} else {
			// 				const lineWithCurrentWord = pipe(
			// 					lastLine,
			// 					RNEA.fromReadonlyArray,
			// 					O.match(
			// 						() => RNEA.of(currentWord),
			// 						flow(RA.append(currentWord)),
			// 					),
			// 				);

			// 				return [
			// 					...acc.slice(0, -1),
			// 					lineWithCurrentWord,
			// 				];
			// 			}
			// 		}
			// 	},
			// ),
			// RA.map((line) => line.join(joiner)),
		);
	}
}
