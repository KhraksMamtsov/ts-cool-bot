import { Context, Layer } from "effect";

export interface LinkShortenerOptionsService {
  readonly baseUrl: string;
}

interface LinkShortenerOptions {
  readonly _: unique symbol;
}
export const LinkShortenerOptions = Context.Tag<
  LinkShortenerOptions,
  LinkShortenerOptionsService
>("@link-shortener/LinkShortenerOptions");

export const options = (options: LinkShortenerOptionsService) =>
  Layer.succeed(LinkShortenerOptions, LinkShortenerOptions.of(options));
