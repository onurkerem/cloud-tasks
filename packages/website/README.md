# Cloud Tasks — Website

Astro + Tailwind marketing site for Cloud Tasks.

## Prerequisites
- Node.js ( LTS)

## Setup
```sh
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the build
npm run check    # astro check (types)
```

The site is a single page (`src/pages/index.astro`) styled with Tailwind v4 tokens defined in
`src/styles/global.css`. The hero shows a copyable agent-install prompt that deploys Cloud Tasks
into a visitor's own Cloudflare account.
