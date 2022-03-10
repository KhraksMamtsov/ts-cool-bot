import * as Line from "../Line";

describe("Line", () => {
	test("size", () => {
		expect(
			Line.size({
				content: Line.createLineContent(/\s+/)(""),
				options: { separator: "-" },
			}),
		).toBe(0);
		expect(
			Line.size({
				content: Line.createLineContent(/\s+/)(" "),
				options: { separator: "-" },
			}),
		).toBe(0);
		expect(
			Line.size({
				content: Line.createLineContent(/\s+/)(" 1 "),
				options: { separator: "-" },
			}),
		).toBe(1);
	});
});
