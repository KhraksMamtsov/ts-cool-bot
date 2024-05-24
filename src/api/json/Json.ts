import { Either, identity } from "effect";

export const stringify = <A>(a: A) =>
  Either.try({
    try: () => JSON.stringify(a),
    catch: identity,
  });
