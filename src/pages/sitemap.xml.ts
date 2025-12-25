/**
 * Master Sitemap Index
 * Links to all sub-sitemaps (products, categories, pages, static)
 */

import type { APIRoute } from 'astro';
import { generateSitemapIndex, getBaseUrl, getSitemapHeaders } from '@/lib/sitemap-utils';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const baseUrl = getBaseUrl();
    const now = new Date().toISOString();

    // Generate sitemap index with all sub-sitemaps
    const sitemaps = [
      {
        loc: `${baseUrl}/sitemap-static.xml`,
        lastmod: now,
      },
      {
        loc: `${baseUrl}/sitemap-categories.xml`,
        lastmod: now,
      },
      {
        loc: `${baseUrl}/sitemap-pages.xml`,
        lastmod: now,
      },
      {
        loc: `${baseUrl}/sitemap-products.xml`,
        lastmod: now,
      },
      {
        loc: `${baseUrl}/api/facebook-feed.xml`,
        lastmod: now,
      },
    ];

    const xml = generateSitemapIndex(sitemaps, baseUrl);

    return new Response(xml, {
      status: 200,
      headers: getSitemapHeaders(),
    });
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
