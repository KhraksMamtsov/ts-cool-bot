import { pipe } from "fp-ts/lib/function";
import * as RR from "fp-ts/ReadonlyRecord";
import * as RA from "fp-ts/ReadonlyArray";
import * as string from "fp-ts/string";

type TemplateContext<Keys extends string> = Id<RR.ReadonlyRecord<Keys, string>>;
type TemplateInlineDelegate<Context extends TemplateContext<string>> = (
  context: Context
) => string;

export function compile<Context extends string>(
  base: string
): TemplateInlineDelegate<TemplateContext<Context>> {
  return (context) =>
    pipe(
      context,
      RR.toReadonlyArray,
      RA.reduce(base, (acc, [key, value]) =>
        acc.replaceAll(`{{${key}}}`, value)
      )
    );
}

type Id<T> = {} & { [P in keyof T]: T[P] };
type XXX<
  A extends TemplateContext<string>,
  B extends TemplateContext<string>
> = Id<
  Readonly<
    Omit<A, keyof B> & {
      [K in Exclude<keyof B, keyof A>]: never;
    }
  >
>;

type x = XXX<{ a: ""; b: "" }, { b: ""; c: "" }>;

export function contextP<K extends TemplateContext<string>>(partialContext: K) {
  return function contextPWithPartialContext<
    K1 extends TemplateContext<string>
  >(
    template: TemplateInlineDelegate<XXX<K1, K>>
  ): TemplateInlineDelegate<XXX<K1, K>> {
    return (context) => template({ ...partialContext, ...context } as any);
  };
}

export function finalize(template: TemplateInlineDelegate<never>): string {
  return template({} as never);
}
