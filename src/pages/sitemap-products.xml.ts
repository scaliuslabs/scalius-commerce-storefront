/**
 * Products Sitemap
 * Contains all active product pages
 * Supports pagination for large product catalogs (?page=1)
 * Limit: 50,000 URLs per sitemap page (as per sitemap protocol)
 */

import type { APIRoute } from 'astro';
import { generateSitemap, getBaseUrl, getSitemapHeaders } from '@/lib/sitemap-utils';
import type { SitemapUrl } from '@/lib/sitemap-utils';
import { getAllProducts } from '@/lib/api/products';
import type { Product } from '@/lib/api/types';

export const prerender = false;

const URLS_PER_SITEMAP = 50000; // Max URLs per sitemap as per protocol

export const GET: APIRoute = async ({ url }) => {
  try {
    const baseUrl = getBaseUrl();

    // Get page number from query params (default to 1)
    const pageParam = url.searchParams.get('page');
    const sitemapPage = pageParam ? parseInt(pageParam, 10) : 1;

    if (isNaN(sitemapPage) || sitemapPage < 1) {
      return new Response('Invalid page parameter', { status: 400 });
    }

    const allProducts: Product[] = [];
    let currentPage = 1;
    let hasMore = true;
    const limit = 100; // Fetch 100 products per API call

    // Calculate which products to include in this sitemap page
    const startIndex = (sitemapPage - 1) * URLS_PER_SITEMAP;
    const endIndex = startIndex + URLS_PER_SITEMAP;

    // Fetch all active products with pagination
    // Note: In production, you might want to optimize this to only fetch the needed range
    while (hasMore && allProducts.length < endIndex) {
      const response = await getAllProducts({
        page: currentPage,
        limit: limit,
      });

      console.log(`[Sitemap] Fetching products page ${currentPage}:`, {
        success: !!response,
        dataLength: response?.data?.length || 0,
        totalProducts: response?.pagination?.total || 0,
        hasData: !!response?.data,
      });

      if (!response || !response.data || response.data.length === 0) {
        if (!response) {
          console.error('[Sitemap] getAllProducts returned null - API may have failed');
        } else if (!response.data) {
          console.error('[Sitemap] Response has no data array:', response);
        }
        hasMore = false;
        break;
      }

      // Log all products and their active status
      console.log(`[Sitemap] Products fetched:`, response.data.map(p => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
      })));

      // Filter products - treat undefined isActive as true (active by default)
      // The API list endpoint doesn't return isActive, so we consider all returned products as active
      const activeProducts = response.data.filter((product) => product.isActive !== false);
      console.log(`[Sitemap] Active products: ${activeProducts.length} out of ${response.data.length}`);
      allProducts.push(...activeProducts);

      // Check if there are more pages
      if (response.pagination.page >= response.pagination.totalPages) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }

    if (allProducts.length === 0) {
      console.log('No active products found for sitemap');
      // Return empty sitemap instead of error
      const xml = generateSitemap([], baseUrl);
      return new Response(xml, {
        status: 200,
        headers: getSitemapHeaders(),
      });
    }

    // Slice the products array to get only the products for this sitemap page
    const productsForThisSitemap = allProducts.slice(startIndex, endIndex);

    if (productsForThisSitemap.length === 0 && sitemapPage > 1) {
      return new Response('Page not found', { status: 404 });
    }

    const productUrls: SitemapUrl[] = productsForThisSitemap.map((product) => ({
      loc: `${baseUrl}/products/${product.slug}`,
      lastmod: product.updatedAt,
      changefreq: 'daily' as const,
      priority: 0.9,
    }));

    const xml = generateSitemap(productUrls, baseUrl);

    return new Response(xml, {
      status: 200,
      headers: getSitemapHeaders(),
    });
  } catch (error) {
    console.error('Error generating products sitemap:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
