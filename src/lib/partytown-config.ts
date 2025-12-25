/**
 * Partytown Configuration with Environment Variables
 * This module handles the Partytown proxy configuration for Facebook Pixel
 */

// Get API base URL from environment variables at build time
const getApiBaseUrl = (): string => {
  const apiBaseUrl =
    process.env.PUBLIC_API_BASE_URL ||
    process.env.PUBLIC_API_URL?.replace("/api/v1", "");

  if (!apiBaseUrl) {
    console.warn("No API base URL found in environment variables");
    return "";
  }

  return apiBaseUrl;
};

// Capture the API base URL at build time
export const API_BASE_URL = getApiBaseUrl();

/**
 * Creates the Partytown resolveUrl function with embedded API base URL
 * This function will be serialized and run in a web worker context
 */
export const createPartytownResolveUrl = (): ((
  url: URL,
  location: Location,
  type: string,
) => URL) => {
  const baseUrl = API_BASE_URL;

  // Return a function with the base URL embedded as a string literal
  return new Function(
    "url",
    "_location",
    "type",
    `
    // Proxy Facebook Pixel scripts through our backend
    if (type === "script" && url.hostname === "connect.facebook.net") {
      var apiBaseUrl = "${baseUrl}";
      
      if (!apiBaseUrl) {
        console.error("No API base URL configured for Partytown proxy");
        return url; // Fallback to default resolution
      }

      var proxyUrl = new URL(apiBaseUrl + "/api/__ptproxy");
      proxyUrl.searchParams.set("url", url.href);
      
      console.log(
        "Partytown proxying: " + url.href + " -> " + proxyUrl.href
      );
      
      return proxyUrl;
    }
    
    // Use default resolution for other scripts
    return url;
  `,
  ) as (url: URL, location: Location, type: string) => URL;
};

/**
 * Complete Partytown configuration object
 */
export const partytownConfig = {
  // Forward these methods to the main thread
  forward: ["dataLayer.push", "fbq", "ga", "gtag"] as string[],

  // Custom URL resolver for proxying scripts
  resolveUrl: createPartytownResolveUrl(),

  // Performance optimizations
  debug: false as boolean,
  logCalls: false as boolean,
  logGetters: false as boolean,
  logSetters: false as boolean,
  logImageRequests: false as boolean,
  logMainAccess: false as boolean,
  logSendBeaconRequests: false as boolean,
  logStackTraces: false as boolean,
  logScriptExecution: false as boolean,
};
