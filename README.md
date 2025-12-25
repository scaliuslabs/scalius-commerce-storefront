<p align="center">
  <a href="https://scalius.com">
    <img alt="Scalius Commerce Storefront" src="https://raw.githubusercontent.com/scaliuslabs/scalius-commerce-lite/refs/heads/master/src/assets/logo-dark.png" width="200" />
  </a>
</p>

<h1 align="center">Scalius Commerce Storefront</h1>

<h4 align="center">
  <a href="https://docs.scalius.com">Documentation</a> |
  <a href="https://scalius.com">Website</a>
</h4>

<p align="center">
  A high-performance, modern e-commerce storefront template built with <strong>Astro 5</strong>, <strong>React 19</strong>, and <strong>Tailwind CSS 4</strong>. Designed to work seamlessly with the Open Source <strong>Scalius Commerce Lite Backend</strong>, this storefront is optimized for deployment on <strong>Cloudflare Workers</strong> with edge caching and zero cold starts.
</p>

<p align="center">
  <!-- License: MIT -->
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Scalius Commerce Storefront is released under the MIT license." />
  </a>
  <!-- PRs Welcome -->
  <a href="./CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
  <!-- Security Policy -->
  <a href="./SECURITY.md">
    <img src="https://img.shields.io/badge/Security-Policy-red.svg" alt="Security Policy" />
  </a>
</p>

<p align="center">
  <!-- Twitter / X -->
  <a href="https://scalius.com/x">
    <img src="https://img.shields.io/twitter/follow/scaliuslabs.svg?label=Follow%20@scaliuslabs" alt="Follow @scaliuslabs" />
  </a>
  <!-- Discord -->
  <a href="https://scalius.com/discord">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <!-- Facebook -->
  <a href="https://scalius.com/facebook">
    <img src="https://img.shields.io/badge/Facebook-Follow-1877F2?logo=facebook" alt="Follow on Facebook" />
  </a>
</p>

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
    git clone https://github.com/scaliuslabs/scalius-commerce-storefront.git
    cd scalius-commerce-storefront
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

[MIT](LICENSE) © Scalius
