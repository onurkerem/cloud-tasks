# cloud-tasks-tui

A terminal dashboard for watching [Cloud Tasks](../../README.md) task status. Read-only: it
polls the REST API and shows tasks grouped by status. Designed to be left open in a terminal.

## Setup

```
npm install
cp env.example .env.local   # or export the vars in your shell
```

Required configuration (env or CLI flags):

| Env | Flag | Description |
| --- | --- | --- |
| `WORKER_URL` | `--url` | Base URL of the Cloud Tasks worker, e.g. `http://localhost:8787` |
| `API_KEY` | `--key` | API key configured on the worker |
| `REFRESH_INTERVAL` | `--interval` | Auto-refresh interval in seconds (default `5`) |
| — | `--no-auto` | Start with auto-refresh disabled |

## Run

```
npm start
# or, with flags:
npx tsx src/cli.tsx --url http://localhost:8787 --key <api-key> --interval 10
```

## Keybindings

- `r` — manual refresh
- `a` — toggle auto-refresh on/off
- `1` / `2` / `3` — filter to `todo` / `in_progress` / `done` (press again to clear)
- `f` — clear status filter
- `q` / `Ctrl+C` — quit
