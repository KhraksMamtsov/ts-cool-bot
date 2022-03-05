import * as TE from "fp-ts/TaskEither";
import { promises as fs } from "fs";
import * as EWC from "../../error/ErrorWithCause";
import { parseErrorOrUnknownError } from "../../error/parseError";

type ReadFileParameters = Parameters<typeof fs.readFile>;
type ReadFilePath = ReadFileParameters[0];

export enum ErrorType {
  READ_FILE = "READ_FILE::FSErrorType",
}

export function readFile(path: ReadFilePath) {
  return TE.tryCatch(
    async () => await fs.readFile(path, "utf8"),
    EWC.create({
      type: ErrorType.READ_FILE,
      context: {
        path,
      },
    })(parseErrorOrUnknownError)
  );
}
