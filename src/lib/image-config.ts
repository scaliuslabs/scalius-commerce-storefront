/**
 * Image Configuration with Environment Variables
 * This module handles image domain configuration from CDN_DOMAIN_URL environment variable
 *
 * Supports:
 * - Single domain: CDN_DOMAIN_URL=cdn.scalius.com
 * - Multiple domains: CDN_DOMAIN_URL=cdn.scalius.com,something.com,somethingelse.com
 */

/**
 * Parse CDN domains from environment variables at build time
 */
const getCdnDomains = (): string[] => {
  const cdnDomainUrl = process.env.CDN_DOMAIN_URL;

  if (!cdnDomainUrl) {
    console.warn(
      "No CDN_DOMAIN_URL found in environment variables, using default cdn.scalius.com",
    );
    return ["cdn.scalius.com"];
  }

  // Split by comma and clean up whitespace
  const domains = cdnDomainUrl
    .split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);

  if (domains.length === 0) {
    console.warn("CDN_DOMAIN_URL is empty, using default cdn.scalius.com");
    return ["cdn.scalius.com"];
  }

  console.log(`Configured CDN domains: ${domains.join(", ")}`);
  return domains;
};

// Capture CDN domains at build time
export const CDN_DOMAINS = getCdnDomains();

/**
 * Complete Astro image configuration object
 */
export const imageConfig = {
  // Allowed domains for image optimization
  domains: CDN_DOMAINS,


  // Cache calculated dimensions to improve performance
  remotePatterns: [{ protocol: "https" as const }],
};

/**
 * Export individual parts for flexibility
 */
export { getCdnDomains };
