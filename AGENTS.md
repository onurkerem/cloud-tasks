# Cloud Tasks

Cloud Tasks is a task backend for coding agents: a Cloudflare Workers service with a D1 task
store, a REST API, and an MCP endpoint that exposes the store as agent tools.

## Repository layout

```
cloud-tasks/
├── packages/
│   ├── worker/      # Cloudflare Workers backend (REST + MCP, D1)
│   ├── website/     # Astro marketing website
│   └── tui/         # Terminal dashboard for watching task status (REST client)
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
| `packages/tui` | TypeScript, Ink (React), tsx | `npm start`, `npm run dev`, `npm run typecheck` |

Run every command from inside the relevant package directory.

## Working in this repo

- **Website changes are part of every feature.** Any change to the Worker's REST routes, MCP tools,
  config shape (e.g. `wrangler.jsonc`, `.dev.vars`), deploy flow, or documented behavior must be
  reflected in `packages/website/src/pages/index.astro` — the site is the source of truth users see.
- The hero of the website shows a copyable **agent-install prompt**. If the deploy steps, repo URL,
  or secret/migration commands change, update that prompt in `index.astro` too.
- **Keep all documentation and spec files aligned after every change.** Any change to REST routes,
  request/response shapes, auth, or MCP tools must be reflected together in: `packages/worker/openapi.yaml`
  (REST API spec), `packages/website/src/pages/index.astro` (docs site), and this file if repo
  layout or behavior it describes changes. Treat these as one unit — do not land a route or schema
  change without updating the others in the same pass.
- Before considering work done: run `npm test` and `npm run typecheck` in `packages/worker`, and
  `npm run build` in `packages/website`.
- Root `CLAUDE.md` must remain a short pointer back to this file so Claude Code and Codex follow
  the same project rules.

## Production expectations

- The maintainer runs a real deployment on two custom domains: a website-only host (serves the
  Astro site; `/api` and `/mcp` must not respond there) and an API host (serves `/api` with API-key
  auth, and `/mcp` with Cloudflare Access JWT auth only).
- The maintainer's actual domains and D1 `database_id` live in
  `packages/worker/wrangler.maintainer.jsonc` — a git-tracked, maintainer-only config file (see its
  header comment). Agents helping the maintainer with production work should read that file
  directly rather than asking; self-hosters should ignore it entirely.
- `npm run deploy:prod` (maintainer-only) deploys against `wrangler.maintainer.jsonc` via
  `wrangler -c`, so a single command serves both custom domains.
- Keep the public self-host path generic: `packages/worker/wrangler.jsonc` (the template
  self-hosters actually use) must never reference the maintainer's custom domains or database_id.

## Notes

- `packages/worker/wrangler.jsonc` (the generic template) always keeps a placeholder D1
  `database_id` (`00000000-…`) and no `custom_domains`. Self-hosters run `npm run deploy:prepare` to
  create a new D1 in their own account, and add their own `custom_domains` if they want one.
- `packages/worker/wrangler.maintainer.jsonc` holds the maintainer's real production values. Never
  copy its `database_id` or `custom_domains` into the generic `wrangler.jsonc` template.
