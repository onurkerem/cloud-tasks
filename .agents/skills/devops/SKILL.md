---
name: devops
description: Manage DevOps for any project — CI/CD workflows, release pipelines, install scripts, PR checks, deployment, and release publishing. Automatically invoke this skill after code changes that affect build steps, add new dependencies, change entry points, modify test commands, or add/remove packages. Also trigger when the user says "set up CI", "add a release workflow", "create an install script", "prepare for release", "publish", "deploy", or any mention of DevOps, GitHub Actions, or CI/CD. This skill manages the full lifecycle — initial setup, ongoing maintenance, and release execution.
---

# DevOps Management

You are managing the DevOps lifecycle for a project. This skill handles CI/CD setup, release automation, install scripts, and deployment — from greenfield to ongoing maintenance.

## When to activate

This skill applies in two modes:

**Automatic (after code changes):** After any change that affects the build, test, or release surface, ask the user if a DevOps review is needed. Changes that warrant a check:
- New or changed `package.json` scripts (build, test, lint)
- New dependencies that affect the production bundle
- Changed entry points or binary names
- New packages added to a monorepo
- Changes to TypeScript/compilation config that affect output structure
- New features that should be reflected in CI checks

**Explicit (user request):** When the user asks for DevOps setup, CI/CD, release automation, install scripts, or deployment.

## Process

### 1. Audit

Read the project to understand its current DevOps state. Do this every time — even for ongoing maintenance, the audit catches drift.

Check these in order:
1. Read `AGENTS.md` and `CLAUDE.md` if they exist.
2. Read the project manifest (`package.json`, `go.mod`).
3. List `.github/workflows/` — what CI/CD already exists?
4. Check for `install.sh`, `Dockerfile`, `Makefile`, `.gitignore`.
5. Find the git remote to extract owner/repo slug.
6. Identify project type and structure (monorepo? CLI? library? web app?).

Based on the audit, classify the project type and determine what DevOps components it needs. Read `references/project-types.md` for the component matrix.

### 2. Gap analysis

Compare what exists against what the project needs. Present gaps to the user as a brief list:

"DevOps audit found: release workflow (exists), CI/PR checks (missing), install script (missing). Want me to fill the gaps?"

For maintenance visits, focus on whether existing workflows are still aligned with the current build/test commands. Things drift.

### 3. Confirm plan

Before writing files, confirm with the user:
- Which components to add or update
- Distribution method (GitHub Releases, npm, Docker, GitHub Pages)
- Any decisions not derivable from the codebase

Keep this brief. Skip if the user says "just do it" or context is unambiguous.

### 4. Implement

Load the relevant reference files as needed based on what you're implementing:

| Component | Reference |
|---|---|
| Project type → component mapping | `references/project-types.md` |
| Release workflow | `references/release-workflow.md` |
| CI/PR checks | `references/ci-workflow.md` |
| Install script | `references/install-script.md` |
| .gitignore | `references/gitignore.md` |
| Release process (tagging, versioning) | `references/release-process.md` |
| Node.js specifics | `references/nodejs.md` |
| Go specifics | `references/go.md` |

Only load the references you need. A Node.js CLI tool doesn't need `go.md`.

After implementing, update project documentation (README, AGENTS.md, CLAUDE.md) to reflect the DevOps setup.

### 5. Verify

Validate everything:
- YAML: `python3 -c "import yaml; yaml.safe_load(open(path))"`
- Shell: `sh -n install.sh`
- Run CI commands locally: `npm ci && npm test && npm run build` (or equivalent)
- Check workflows reference correct paths (working-directory, entry points, binary names)
- Verify no placeholder values remain in generated files

## Design principles

- **GitHub Releases as default distribution.** `GITHUB_TOKEN` (auto-provided) is the only secret. No external registries unless the project needs them.
- **Tag-driven releases.** Push a `v*` tag, get a release. No manual UI clicks.
- **CI mirrors release.** Every PR runs the same test/build steps the release pipeline runs.
- **POSIX sh for install scripts.** No bashisms — must work on macOS, Linux, and WSL.
- **One working path.** One way to test, one way to release, one way to install.

## Releasing

When the user wants to cut a release, read `references/release-process.md` for the version-bump → commit → tag → push flow. Never push to remote without user confirmation.
