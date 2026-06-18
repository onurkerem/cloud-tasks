# Project Types — Component Matrix

Classify the project to determine which DevOps components it needs.

## Component Matrix

| Project type | Release workflow | Install script | CI/PR checks |
|---|---|---|---|
| CLI tool (Node.js) | Yes — tag-based, tarball + GitHub Release | Yes — curl \| sh | Yes |
| CLI tool (Go) | Yes — tag-based, cross-compile binaries | Yes — curl \| sh | Yes |
| Library (npm) | Yes — tag-based, npm publish | No | Yes |
| API server | Yes — Docker image + deploy | No | Yes |

## How to classify

1. **Check the manifest** — `package.json` with a `bin` field → CLI tool. `package.json` without `bin` → library. `go.mod` with `main` package → CLI tool.
2. **Check for server indicators** — `express`, `fastify` → API server.
3. **Check for Dockerfile** — if present, likely an API server or service.
4. **Check monorepo structure** — `packages/` with multiple subdirectories → monorepo. Each package may have a different type.

## Distribution method decision

- **GitHub Releases + tarball**: Default for CLI tools. No secrets needed. Install via `curl | sh`.
- **npm publish**: For libraries meant to be imported. Requires `NPM_TOKEN` secret.
- **Docker image**: For services/deployable apps. Requires registry credentials.

## Monorepo considerations

- Set `defaults.run.working-directory` in workflows to the package directory (e.g., `packages/cli`).
- If multiple packages need CI, use a matrix strategy or separate jobs.
- Release workflow targets the main deliverable package only.
- Install script references the main package's tarball.

## What each project type needs from CI

Every project gets these CI steps:
1. Install dependencies
2. Typecheck (if TypeScript/compiled language)
3. Lint (if linter configured)
4. Test
5. Build

The order is fixed. Skip steps that don't apply (no linter configured → skip lint).
