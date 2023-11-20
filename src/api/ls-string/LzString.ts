import LZString from "lz-string";
import { Either as E, pipe, Option as O, Data } from "effect";

export enum ErrorType {
  DECOMPRESS = "DECOMPRESS::LzStringErrorType",
  COMPRESS = "COMPRESS::LzStringErrorType",
}

export class LzStringDecompressError extends Data.TaggedError(
  ErrorType.DECOMPRESS,
)<{ readonly compressed: string; readonly cause: unknown }> {}
export class LzStringCompressError extends Data.TaggedError(
  ErrorType.COMPRESS,
)<{ readonly uncompressed: string; readonly cause: unknown }> {}

export const decompress = (compressed: string) =>
  pipe(
    E.try({
      try: () => LZString.decompressFromEncodedURIComponent(compressed),
      catch: (cause) => new LzStringDecompressError({ compressed, cause }),
    }),
    E.map(O.fromNullable),
  );

export const compress = (uncompressed: string) =>
  E.try({
    try: () => LZString.compressToEncodedURIComponent(uncompressed),
    catch: (cause) => new LzStringCompressError({ uncompressed, cause }),
  });
