import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/Either";
import * as ErrorWithCause from "../../../error/ErrorWithCause";
import * as Twoslash from "../Twoslash";

describe("Twoslash", () => {
	describe("twoslash", () => {
		test("twoslash", () => {
			const testCode = `
interface FormFields {
  name: string; asd: number; qwe: boolean;
}
const form: FormFields = {
  name: 1, asd: '', qwe: 2
};
      `;
			const result = pipe(
				testCode,
				Twoslash.create({
					defaultOptions: {
						noStaticSemanticInfo: true,
						noErrorValidation: true,
					},
				}),
				E.mapLeft((error) => {
					return ErrorWithCause.show(error.cause);
				}),
			);

			expect(result).toEqualRight(2);
		});

		test("inlineErrors", () => {
			const testData: Twoslash.Result = {
				code: `
interface FormFields {
  name: string; asd: number; qwe: boolean;
}
const form: FormFields = {
  name: 1, asd: '', qwe: 2
};
`,
				errors: [
					{
						category: 1,
						character: 2,
						code: 2322,
						id: "err-2322-98-4",
						length: 4,
						line: 5,
						renderedMessage:
							"Type 'number' is not assignable to type 'string'.",
						start: 98,
					},
					{
						category: 1,
						character: 11,
						code: 2322,
						id: "err-2322-107-3",
						length: 3,
						line: 5,
						renderedMessage:
							"Type 'string' is not assignable to type 'number'.",
						start: 107,
					},
					{
						category: 1,
						character: 20,
						code: 2322,
						id: "err-2322-116-3",
						length: 3,
						line: 5,
						renderedMessage:
							"Type 'number' is not assignable to type 'boolean'.",
						start: 116,
					},
				],
				extension: "tsx",
				highlights: [],
				playgroundURL:
					"https://www.typescriptlang.org/play/#code/FASwdgLgpgTgZgQwMZQAQDED2MC26RQA2AJgM6oDewqqYCOUAXKqRDOAOYDcqCpxzMAFccAI1g8AjgHcmqUZkyEoCMF2ABfYEkxhWqONhzMsufETKoAvJWq16cgIwAaXv2YByD65lyATJrqNMGoQA",
				queries: [],
				staticQuickInfos: [],
				tags: [],
			};
			expect(Twoslash.inlineErrors(testData)).toBe(123);
		});

		test("wrapLine", () => {
			const testComment = `Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'FormFields'.`;

			expect(
				Twoslash.wrapLine({ maxWidth: 55 })(testComment),
			).toStrictEqual([
				"Element implicitly has an 'any' type because expression",
				"of type 'string' can't be used to index type",
				"'FormFields'.",
			]);
		});
		test("wrapText", () => {
			const testComment = `Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'FormFields'.
		No index signature with a parameter of type 'string' was found on type 'FormFields'.`;

			expect(
				Twoslash.wrapText({ maxWidth: 55 })(testComment),
			).toEqualSome([
				"// Element implicitly has an 'any' type because",
				"// expression of type 'string' can't be used to index",
				"// type 'FormFields'.",
				"// No index signature with a parameter of type 'string'",
				"// was found on type 'FormFields'.",
			]);
		});
	});
});

// interface FormFields {
// 	name: string;
// }
// const form: FormFields = {
// 	name: 1,
// 	// (2322) Type 'number' is not assignable to type
// 	// 'string'.
// };
