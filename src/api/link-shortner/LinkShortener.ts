import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  FetchHttpClient,
} from "@effect/platform";
import { Schema, Effect, Config } from "effect";

class LinkShortenerRequestSchema extends Schema.Class<LinkShortenerRequestSchema>(
  "LinkShortenerRequestSchema"
)({ url: Schema.URL }) {}

class LinkShortenerResponseSchema extends Schema.Class<LinkShortenerResponseSchema>(
  "LinkShortenerResponseSchema"
)({ shortened: Schema.URL }) {}

export class LinkShortener extends Effect.Service<LinkShortener>()(
  "@link-shortener/LinkShortener",
  {
    dependencies: [FetchHttpClient.layer],
    effect: Effect.gen(function* () {
      const baseUrl = yield* Config.url("LINK_SHORTENER_URL");
      const defaultClient = yield* HttpClient.HttpClient;

      const withBody = HttpClientRequest.schemaBodyJson(
        LinkShortenerRequestSchema
      );
      const req = HttpClientRequest.post(new URL("/api/short", baseUrl));

      const shortenLink = (args: LinkShortenerRequestSchema) => {
        return (req).pipe(
          withBody(args),          
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
    }),
  }
) {}
