# Cloud Tasks

A task backend for coding agents. Give your AI coding tools a shared, persistent to-do list they can read, write, and pick work from — backed by a tiny Cloudflare Worker and a D1 database.

## What it is

Cloud Tasks is a small service that stores tasks (description, tags, assignee, status) and exposes them two ways:

- A **REST API** for scripts, dashboards, and direct human use.
- An **MCP endpoint** for coding agents — so Claude Code, Codex, opencode, and friends can create, list, update, and claim tasks as they work.

It runs entirely on Cloudflare's free tier (Workers + D1) and is built to be self-hosted in your own account. Your task data never leaves your Cloudflare account.

## Why

Coding agents are more useful when they can plan in a shared, durable place instead of holding everything in context. Cloud Tasks gives every agent — and you — one lightweight source of truth for what needs doing, who's doing it, and what's done. No database to run, no SaaS to sign up for.

## How it's used

Two audiences, two doors:

- **Coding agents** connect to the `/mcp` endpoint and get tools to create, list, get, update, and delete tasks, plus `claim_next_task`, which atomically assigns the oldest open task to the agent that calls it.
- **Humans and scripts** talk to `/api` with an API key to seed tasks, watch progress, build dashboards, or move items by hand.

The two doors are intentionally separate: agent access is gated by Cloudflare Access (an identity, not a shared secret), while the REST API uses an API key for automation. An agent never needs your API key, and a script never needs your identity.

## Get it running

Cloud Tasks is self-hosted in your own Cloudflare account. The easiest path is to hand the install to a coding agent:

1. Open the website: **https://cloud-tasks.keremorenli.com**
2. Copy the install prompt from the hero.
3. Paste it into your agent. It will clone the repo, create the D1 database, set your API key and Cloudflare Access, deploy, and hand back your URLs.

Prefer to run it yourself? Wrangler commands, migrations, and secrets are all in [`AGENTS.md`](./AGENTS.md).

## Watch tasks from a terminal

`packages/tui` is a small terminal dashboard that polls `/api/tasks` and shows every task grouped by status, with optional auto-refresh — leave it open in a terminal while agents work.

Point it at your production deployment with the same `WORKER_URL` and `API_KEY` you used to run the production smoke test (the API host — a custom domain or `https://cloud-tasks.<my-subdomain>.workers.dev` — not the website-only host):

```
cd packages/tui
npm install
WORKER_URL=<your api host url> API_KEY=<your API_KEY secret> npm start
```

See [`packages/tui/README.md`](./packages/tui/README.md) for flags (`--interval`, `--no-auto`) and keybindings.

## Repository

```
cloud-tasks/
├── packages/
│   ├── worker/      # Cloudflare Workers backend (REST + MCP, D1)
│   ├── website/     # Astro marketing website
│   └── tui/         # Terminal dashboard for watching task status (REST client)
├── AGENTS.md        # Technical stack, commands, and deploy details
└── README.md
```

For the technical stack, build/test commands, API specs, and deployment procedures, see [`AGENTS.md`](./AGENTS.md).
