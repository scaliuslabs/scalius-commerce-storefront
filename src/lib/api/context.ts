import { AsyncLocalStorage } from "node:async_hooks";
import type { Fetcher } from "@cloudflare/workers-types";

// Context injected per-request by Astro middleware
interface ApiContext {
    BACKEND_API?: Fetcher;
}

export const apiContext = new AsyncLocalStorage<ApiContext>();
