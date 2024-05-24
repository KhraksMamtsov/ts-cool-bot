import { Effect, Layer } from "effect";

export interface LinkShortenerOptionsService {
  readonly baseUrl: string;
}

export class LinkShortenerOptions extends Effect.Tag(
  "@link-shortener/LinkShortenerOptions"
)<LinkShortenerOptions, LinkShortenerOptionsService>() {}

export const options = (options: LinkShortenerOptionsService) =>
  Layer.succeed(LinkShortenerOptions, LinkShortenerOptions.of(options));
