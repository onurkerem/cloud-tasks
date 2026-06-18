# Cloud Tasks

Cloud Tasks is a task backend for coding agents: a Cloudflare Workers service with a D1 task
store, a REST API, and an MCP endpoint that exposes the store as agent tools.

## Repository layout

```
cloud-tasks/
├── packages/
│   ├── worker/      # Cloudflare Workers backend (REST + MCP, D1)
│   └── website/     # Astro marketing website
├── README.md
├── CLAUDE.md        # Claude Code pointer to these instructions
└── AGENTS.md
```

Each package is independent — its own `package.json`, `node_modules`, and tooling. There is no
shared workspace config. Coordinate between them through this file.

## Toolchain

| Package | Stack | Commands |
| --- | --- | --- |
| `packages/worker` | TypeScript, Cloudflare Workers, Wrangler, D1, agents/MCP SDK, Zod, Vitest | `npm run dev`, `npm test`, `npm run typecheck`, `npm run deploy:prod` |
| `packages/website` | Astro 6, Tailwind 4, TypeScript | `npm run dev`, `npm run build`, `npm run preview`, `npm run check` |

Run every command from inside the relevant package directory.

## Working in this repo

- **Website changes are part of every feature.** Any change to the Worker's REST routes, MCP tools,
  config shape (e.g. `wrangler.jsonc`, `.dev.vars`), deploy flow, or documented behavior must be
  reflected in `packages/website/src/pages/index.astro` — the site is the source of truth users see.
- The hero of the website shows a copyable **agent-install prompt**. If the deploy steps, repo URL,
  or secret/migration commands change, update that prompt in `index.astro` too.
- Before considering work done: run `npm test` and `npm run typecheck` in `packages/worker`, and
  `npm run build` in `packages/website`.
- Root `CLAUDE.md` must remain a short pointer back to this file so Claude Code and Codex follow
  the same project rules.

## Production expectations

- The Astro website is published at `https://cloud-tasks.keremorenli.com`.
- Production API requests (API key auth) are served under `https://cloud-tasks.keremorenli.com/api`.
- The production MCP endpoint for coding agents (API key auth) is at `https://cloud-tasks.keremorenli.com/mcp`.
- `https://tasks.keremorenli.com` is the same Worker but protected by Cloudflare Access / Managed
  OAuth — used by ChatGPT and other OAuth MCP clients.
- Both custom domains are declared in `wrangler.jsonc` under `custom_domains`; the single deploy
  command serves both.
- Keep the public self-host path generic: do not require visitors to deploy Kerem's custom domain.

## Notes

- `packages/worker/wrangler.jsonc` may contain a real D1 `database_id` for the maintainer's account.
  The website's install prompt resets it to the placeholder `00000000-…` so fresh installs create a
  new D1 in the visitor's own account via `npm run deploy:prepare`.
