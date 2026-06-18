# packages/website — Cloud Tasks marketing site

Astro-based marketing website for Cloud Tasks.

## Stack
- Astro 6, Tailwind 4, TypeScript

## Commands
npm run dev / build / preview / check

## Structure
- src/pages/ — Astro pages (single page: `index.astro`)
- src/layouts/ — layout components
- src/styles/ — global styles (design tokens in `global.css`)

## Notes
- The hero terminal holds the copyable **agent-install prompt**. If the Worker's deploy steps,
  repo URL, or secret/migration commands change, update `installPrompt` in `src/pages/index.astro`.
- `astro.config.ts` sets `site: "https://tasks.keremorenli.com"`. Update it if the domain changes.
