import * as Http from "@effect/platform/HttpClient";
import { Context, Effect, Layer } from "effect";
import { Schema } from "@effect/schema";
import { LinkShortenerOptions } from "./LinkShortenerOptions.js";

const LinkShortenerRequestSchema = Schema.struct({ url: Schema.string });
const LinkShortenerResponseSchema = Schema.struct({ shortened: Schema.string });

const makeLinkShortener = Effect.gen(function* (_) {
  const { baseUrl } = yield* _(LinkShortenerOptions);
  const defaultClient = yield* _(Http.client.Client);

  const shortenLink = defaultClient.pipe(
    Http.client.mapRequest(Http.request.prependUrl(baseUrl)),
    Http.client.mapEffect(
      Http.response.schemaBodyJson(LinkShortenerResponseSchema),
    ),
    Http.client.schemaFunction(LinkShortenerRequestSchema),
  )(Http.request.post("/api/short"));

  return {
    shortenLink,
  } as const;
});

export interface LinkShortenerService
  extends Effect.Effect.Success<typeof makeLinkShortener> {}

export interface LinkShortener {
  readonly _: unique symbol;
}
export const LinkShortener = Context.Tag<LinkShortener, LinkShortenerService>(
  "@link-shortener/LinkShortener",
);

export const LinkShortenerLive = Layer.provide(
  Layer.effect(LinkShortener, makeLinkShortener),
  Http.client.layer,
);
