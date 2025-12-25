# Scalius Commerce Lite Storefront

A high-performance, modern e-commerce storefront template built with **Astro 5**, **React 19**, and **Tailwind CSS 4**. Designed to work seamlessly with the Open Source **Scalius Commerce Lite Backend**, this storefront is optimized for deployment on **Cloudflare Workers** with edge caching and zero cold starts.

## 🚀 Key Features

- **⚡ Ultra-Fast Performance**: Built on Astro's server-side rendering (SSR) optimized for the Edge.
- **🌍 Cloudflare Workers Adapter**: Deploys natively to Cloudflare's global network with zero cold starts.
- **💾 Smart Edge Caching**: Custom L2 caching strategy using Cloudflare Cache API + KV for instant sub-second page loads.
- **🖼️ Optimized Images**: Real-time image resizing and optimization via Cloudflare Images (production) or Squoosh (local).
- **🛍️ Full Commerce Functionality**:
  - Dynamic Product & Category pages
  - Full Cart & Checkout flow
  - Search with Command Palette
  - Product Variants & Image Zoom
- **🎨 Modern UI/UX**:
  - **Tailwind CSS v4** for styling
  - **Radix UI** for accessible primitives
  - **Lucide React** for beautiful icons
  - **Sonner** for toast notifications
- **🔍 SEO Ready**: Auto-generated sitemaps, semantic HTML, and structured data.

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Nano Stores](https://github.com/nanostores/nanostores)
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Package Manager**: pnpm

## 📁 Project Structure

```bash
├── public/              # Static assets
├── scripts/             # Build and utility scripts
├── src/
│   ├── components/      # UI Components (Header, Footer, Product, etc.)
│   ├── layouts/         # Page layouts (Layout.astro)
│   ├── lib/             # Utilities, API client, middleware helpers
│   │   ├── api/         # Backend API client implementation
│   │   └── edge-cache.ts # Custom Edge Caching logic
│   ├── pages/           # File-based routing
│   │   ├── api/         # Internal API routes
│   │   ├── products/    # Product details pages
│   │   ├── cart.astro   # Cart page
│   │   └── [slug].astro # Dynamic catch-all routes
│   ├── store/           # Global state (Cart, Toast, etc.)
│   └── middleware.ts    # Edge caching and CSP middleware
├── astro.config.mjs     # Astro configuration
├── tailwind.config.mjs  # Tailwind configuration
└── wrangler.toml        # Cloudflare Workers configuration
```

## 🏁 Getting Started

### Prerequisites

- **Node.js**: v18.17.1 or higher (v20+ recommended)
- **pnpm**: v9+ (Recommended package manager)

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/your-org/scalius-commerce-lite-storefront.git
    cd scalius-commerce-lite-storefront
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Configuration

Copy the example environment file:

```bash
cp env.template .env
```

Update `.env` with your backend details:

| Variable         | Description                                       |
| :--------------- | :------------------------------------------------ |
| `API_TOKEN`      | Auth token for communicating with Scalius Backend |
| `JWT_SECRET`     | Secret key for JWT verification                   |
| `PURGE_TOKEN`    | Token used to authenticate cache purge requests   |
| `PUBLIC_API_URL` | The public URL of your Scalius Backend API        |
| `STOREFRONT_URL` | The URL where this storefront is deployed         |
| `CDN_DOMAIN_URL` | Domain for your CDN (for image optimization)      |

### Development

Start the local development server:

```bash
pnpm dev
```

The site will be available at `http://localhost:4321`.

### Build & Preview

To build the project for production:

```bash
pnpm build
```

To preview the build locally:

```bash
pnpm preview
```

## ☁️ Deployment

This project is configured for **Cloudflare Workers**.

1.  **Login to Cloudflare**:

    ```bash
    npx wrangler login
    ```

2.  **Deploy**:
    ```bash
    npx wrangler deploy
    ```

Ensure you have configured your secrets in Cloudflare:

```bash
npx wrangler secret put API_TOKEN
npx wrangler secret put JWT_SECRET
# ... repeat for other secrets
```

## 🧩 Backend Integration

This storefront requires a running instance of the **Scalius Commerce Lite Backend**. Ensure your `PUBLIC_API_URL` points to the correct backend endpoint.

The API client in `src/lib/api/` handles communication with the backend, including:

- Fetching products, categories, and collections.
- Handling cart operations.
- Processing orders.

## ⚡ Performance Optimization

### Edge Caching

The project uses a sophisticated `middleware.ts` to implements **L2 Caching** at the edge. It uses Cloudflare's Cache API combined with KV for versioning (`v_hostname`).

- **Cacheable Paths**: Homepage, Products, Categories, Search, Sitemaps.
- **Invalidation**: The `PURGE_TOKEN` allows the backend to trigger cache purges when content updates.

### Image Optimization

- **Development**: Uses `squoosh` service.
- **Production**: Uses Cloudflare Images service via `@astrojs/cloudflare` adapter for on-the-fly resizing and format conversion (WebP/AVIF).

## 📄 License

[MIT](LICENSE) © Scalius Labs
