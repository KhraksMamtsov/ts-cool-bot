import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  FetchHttpClient,
} from "@effect/platform";
import { Schema, Effect, Layer } from "effect";
import { LinkShortenerOptions } from "./LinkShortenerOptions.js";

class LinkShortenerRequestSchema extends Schema.Class<LinkShortenerRequestSchema>(
  "LinkShortenerRequestSchema"
)({ url: Schema.String }) {}

class LinkShortenerResponseSchema extends Schema.Class<LinkShortenerResponseSchema>(
  "LinkShortenerResponseSchema"
)({ shortened: Schema.String }) {}

const makeLinkShortener = Effect.gen(function* () {
  const { baseUrl } = yield* LinkShortenerOptions;
  const defaultClient = yield* HttpClient.HttpClient;

  const withBody = HttpClientRequest.schemaBodyJson(LinkShortenerRequestSchema);
  const req = HttpClientRequest.post(new URL("/api/short", baseUrl));

  const shortenLink = (args: LinkShortenerRequestSchema) => {
    return withBody(args)(req).pipe(
      Effect.flatMap(defaultClient.execute),
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(LinkShortenerResponseSchema)
      )
    );
  };

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
  FetchHttpClient.layer
);
