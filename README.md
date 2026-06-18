# Cloud Tasks

Lightweight Cloudflare Workers backend with D1 persistence, API-key protected REST CRUD, and a remote MCP endpoint for agents.

## Product Choice

This project uses the Cloudflare free-plan friendly stack:

- Workers for the REST API and MCP endpoint.
- D1 for persistent, filterable task records.
- Worker Secrets for `API_KEY`.

Durable Objects are intentionally not used because the MCP tools are stateless. Add them later only if you need stateful MCP sessions or strong coordination beyond the current D1 update queries.

## Local Setup

```sh
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Use `Authorization: Bearer <API_KEY>` or `x-api-key: <API_KEY>`.

## REST API

- `GET /api/tasks?status=todo&assignee=agent-a&tag=backend&q=text&limit=50&offset=0`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/claim`

Task body:

```json
{
  "description": "Do the thing",
  "tags": ["backend"],
  "assignee": "agent-a",
  "status": "todo"
}
```

## MCP Endpoint

`/mcp` exposes these tools:

- `create_task`
- `list_tasks`
- `get_task`
- `update_task`
- `delete_task`
- `claim_next_task`

The MCP endpoint uses the same API key header as REST.

## Deploy

```sh
npx wrangler login
npm run deploy:prepare
```

Then:

```sh
npx wrangler secret put API_KEY
npm run deploy:prod
```

Production smoke test:

```sh
WORKER_URL=https://cloud-tasks.<your-subdomain>.workers.dev API_KEY=<secret> npm run smoke:prod
```
