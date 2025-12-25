// src/lib/middleware-helper/csp-handler.ts

/**
 * Parse additional domains from CSP_ALLOWED environment variable
 * and add them with wildcard subdomains to CSP directives
 */
function parseAdditionalDomains(): string[] {
  const additionalDomains = process.env.CSP_ALLOWED?.trim();
  if (!additionalDomains) {
    return [];
  }

  return additionalDomains
    .split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0)
    .flatMap((domain) => {
      // Remove protocol if present
      const cleanDomain = domain.replace(/^https?:\/\//, "");
      // Add both the domain and its wildcard subdomain
      return [`https://${cleanDomain}`, `https://*.${cleanDomain}`];
    });
}

// Define essential hardcoded CSP directives that should never be configurable
// These are the most critical domains needed for the application to function
const ESSENTIAL_SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'", // Consider reducing usage if possible
  "data:",
  "'unsafe-eval'", // Often needed by frameworks, but review alternatives
];

const ESSENTIAL_CONNECT_SRC = [
  "'self'",
  "http://localhost:*", // Explicitly allow localhost for dev
  "http://12.0.0.1:*", // Allow loopback alias
  "http://127.0.2.2:4321", // User specified local IP
  "http://192.168.0.152:4321", // Allow specific local network IP from logs
];

const ESSENTIAL_FRAME_SRC = ["'self'"];

const ESSENTIAL_IMG_SRC = [
  "'self'",
  "data:", // Allow data URIs for images
  "https:", // Allow any HTTPS source for images
  "blob:", // Allow blob URLs for images
];

const ESSENTIAL_WORKER_SRC = [
  "'self'",
  "blob:", // Often used by Partytown or other libraries for web workers
];

// Common third-party domains that are typically safe and commonly used
const COMMON_THIRD_PARTY_DOMAINS = [
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://*.google.com",
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://vitals.vercel-insights.com",
  "https://cdn.jsdelivr.net",
  // Cloudflare Web Analytics / Insights
  "https://static.cloudflareinsights.com",
  "https://*.cloudflareinsights.com",
  "https://cloudflareinsights.com",
];

// Generate script-src directives
function getScriptSrcDirectives(): string[] {
  const additionalDomains = parseAdditionalDomains();
  return [
    ...ESSENTIAL_SCRIPT_SRC,
    ...COMMON_THIRD_PARTY_DOMAINS,
    ...additionalDomains,
  ];
}

// Generate connect-src directives
function getConnectSrcDirectives(): string[] {
  const additionalDomains = parseAdditionalDomains();
  return [
    ...ESSENTIAL_CONNECT_SRC,
    ...COMMON_THIRD_PARTY_DOMAINS,
    "https://connect.facebook.net", // For Facebook Pixel script/connections
    "https://www.facebook.com", // For Facebook Pixel (tr endpoint)
    "https://*.facebook.com", // For FB API calls by the pixel
    ...additionalDomains,
  ];
}

// Generate frame-src directives
function getFrameSrcDirectives(): string[] {
  const additionalDomains = parseAdditionalDomains();
  return [
    ...ESSENTIAL_FRAME_SRC,
    "https://*.google.com", // For Google services like reCAPTCHA
    "https://*.facebook.com", // For Facebook UI elements or login iframes

    ...additionalDomains,
  ];
}

// Generate img-src directives
function getImgSrcDirectives(): string[] {
  const additionalDomains = parseAdditionalDomains();
  return [
    ...ESSENTIAL_IMG_SRC,
    "https://www.facebook.com", // For Facebook Pixel noscript tag
    ...additionalDomains,
  ];
}

// Generate worker-src directives
function getWorkerSrcDirectives(): string[] {
  const additionalDomains = parseAdditionalDomains();
  return [...ESSENTIAL_WORKER_SRC, ...additionalDomains];
}

/**
 * Applies Content Security Policy (CSP) headers to a given Response object.
 *
 * @param response The Astro Response object to modify.
 * @returns The Response object with CSP headers applied.
 */
export function setPageCspHeader(response: Response): Response {
  const cspDirectives = [
    `script-src ${getScriptSrcDirectives().join(" ")}`,
    `connect-src ${getConnectSrcDirectives().join(" ")}`,
    `frame-src ${getFrameSrcDirectives().join(" ")}`,
    `img-src ${getImgSrcDirectives().join(" ")}`,
    "object-src 'none'", // Disallow plugins like Flash
    `worker-src ${getWorkerSrcDirectives().join(" ")}`,
    "base-uri 'self'",
    "form-action 'self' https://www.facebook.com", // Allow form submissions to self and Facebook
    "frame-ancestors 'self'", // Prevent clickjacking
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  return response;
}
