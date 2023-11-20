import { Either as E, identity } from "effect";

export const stringify = <A>(a: A) =>
  E.try({
    try: () => JSON.stringify(a),
    catch: identity,
  });
