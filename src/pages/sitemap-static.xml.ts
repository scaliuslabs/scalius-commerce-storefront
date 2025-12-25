/**
 * Static Pages Sitemap
 * Contains static URLs like homepage, search, cart, etc.
 */

import type { APIRoute } from 'astro';
import { generateSitemap, getBaseUrl, getSitemapHeaders } from '@/lib/sitemap-utils';
import type { SitemapUrl } from '@/lib/sitemap-utils';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const baseUrl = getBaseUrl();

    const staticPages: SitemapUrl[] = [
      {
        loc: `${baseUrl}/`,
        changefreq: 'daily',
        priority: 1.0,
      },
      {
        loc: `${baseUrl}/search`,
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        loc: `${baseUrl}/cart`,
        changefreq: 'weekly',
        priority: 0.3,
      },
    ];

    const xml = generateSitemap(staticPages, baseUrl);

    return new Response(xml, {
      status: 200,
      headers: getSitemapHeaders(),
    });
  } catch (error) {
    console.error('Error generating static sitemap:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
