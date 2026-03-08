/**
 * Runtime environment variable store for Cloudflare Worker bindings.
 *
 * Cloudflare Worker env vars (from wrangler.jsonc `vars` / .dev.vars) are
 * only available at RUNTIME via the Worker's `env` object, NOT through
 * `import.meta.env` (which is a Vite build-time concept).
 *
 * This module provides a simple module-level store that the middleware sets
 * on each request. Unlike apiContext.ts, it has NO dependencies on
 * `node:async_hooks`, so it can be safely imported in client-side code
 * (the SSR-only writes are tree-shaken by Vite).
 *
 * For Astro pages/layouts (.astro files), prefer `Astro.locals.runtime.env`
 * directly instead of this module.
 */

let _publicApiUrl: string | undefined;
let _cdnDomainUrl: string | undefined;

/**
 * Called by middleware on each request to set runtime env vars
 * from `locals.runtime.env` (wrangler.jsonc vars).
 */
export function setRuntimeEnv(vars: {
    PUBLIC_API_URL?: string;
    CDN_DOMAIN_URL?: string;
}): void {
    _publicApiUrl = vars.PUBLIC_API_URL;
    _cdnDomainUrl = vars.CDN_DOMAIN_URL;
}

/** Returns PUBLIC_API_URL from wrangler.jsonc vars (set at runtime by middleware). */
export function getRuntimeApiUrl(): string | undefined {
    return _publicApiUrl;
}

/** Returns CDN_DOMAIN_URL from wrangler.jsonc vars (set at runtime by middleware). */
export function getRuntimeCdnDomain(): string | undefined {
    return _cdnDomainUrl;
}
