import * as Http from "@effect/platform/HttpClient";
import { Context, Effect, Layer } from "effect";
import { Schema } from "@effect/schema";
import { LinkShortenerOptions } from "./LinkShortenerOptions.js";

const LinkShortenerRequestSchema = Schema.Struct({ url: Schema.String });
const LinkShortenerResponseSchema = Schema.Struct({ shortened: Schema.String });

const makeLinkShortener = Effect.gen(function* () {
  const { baseUrl } = yield* LinkShortenerOptions;
  const defaultClient = yield* Http.client.Client;

  const shortenLink = defaultClient.pipe(
    Http.client.mapRequest(Http.request.prependUrl(baseUrl)),
    Http.client.mapEffect(
      Http.response.schemaBodyJson(LinkShortenerResponseSchema)
    ),
    Http.client.schemaFunction(LinkShortenerRequestSchema)
  )(Http.request.post("/api/short"));

  return {
    shortenLink,
  } as const;
});

export interface LinkShortenerService
  extends Effect.Effect.Success<typeof makeLinkShortener> {}

export class LinkShortener extends Effect.Tag("@link-shortener/LinkShortener")<
  LinkShortener,
  LinkShortenerService
>() {}

export const LinkShortenerLive = Layer.provide(
  Layer.effect(LinkShortener, makeLinkShortener),
  Http.client.layer
);
