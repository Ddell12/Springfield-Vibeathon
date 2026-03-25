import { ClientRequestInterceptor } from "@mswjs/interceptors/ClientRequest";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";
// @ts-expect-error — internal API not in public types but stable across MSW v2
import { SetupServerApi } from "msw/node";

import { handlers } from "./handlers";

// Use only Node http/https interceptors — NOT the FetchInterceptor.
// This allows vi.stubGlobal("fetch", mockFetch) to work in hook tests
// without MSW wrapping global.fetch and trying to .clone() mock response objects.
export const server = new SetupServerApi(handlers, [
  new ClientRequestInterceptor(),
  new XMLHttpRequestInterceptor(),
]);
