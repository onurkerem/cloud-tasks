# CI Workflow — PR Checks

Runs on every push to the default branch and on every pull request. Catches issues before they reach the release pipeline.

## Principles

- CI mirrors the release pipeline. Every check that runs on release should also run on PRs.
- Fail fast — if typecheck fails, don't waste time running tests.
- Keep it fast — CI is the feedback loop developers wait on.

## Node.js project

```yaml
name: CI

on:
  push:
    branches: [<default-branch>]
  pull_request:
    branches: [<default-branch>]

jobs:
  check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: <package-path>

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: <node-version>

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test
```

### Adjustments

- Skip `typecheck` step if no `typecheck` script exists in `package.json`.
- Skip `lint` step if no `lint` script exists.
- For monorepos with multiple packages, use a matrix strategy or separate jobs per package.
- Remove `defaults.run.working-directory` for non-monorepo projects.

## Go project

```yaml
      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: <go-version>

      - name: Install dependencies
        run: go mod download

      - name: Vet
        run: go vet ./...

      - name: Test
        run: go test ./...
```

## Verification

After writing the workflow:
1. Validate YAML: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
2. Run the CI commands locally to confirm they work.
3. Ensure the `branches` list matches the project's default branch name.
