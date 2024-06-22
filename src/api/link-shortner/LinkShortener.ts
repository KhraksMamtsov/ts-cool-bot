import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Effect, Layer } from "effect";
import { Schema } from "@effect/schema";
import { LinkShortenerOptions } from "./LinkShortenerOptions.js";

const LinkShortenerRequestSchema = Schema.Struct({ url: Schema.String });
const LinkShortenerResponseSchema = Schema.Struct({ shortened: Schema.String });

const makeLinkShortener = Effect.gen(function* () {
  const { baseUrl } = yield* LinkShortenerOptions;
  const defaultClient = yield* HttpClient.HttpClient;

  const shortenLink = defaultClient.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    HttpClient.mapEffect(
      HttpClientResponse.schemaBodyJson(LinkShortenerResponseSchema)
    ),
    HttpClient.schemaFunction(LinkShortenerRequestSchema)
  )(HttpClientRequest.post("/api/short"));

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
  HttpClient.layer
);
