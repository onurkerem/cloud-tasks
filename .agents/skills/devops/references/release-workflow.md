# Release Workflow

The release workflow builds, tests, packages, and publishes a release. Triggered by pushing a semver tag (`v*`).

## Principles

- Tag-driven: push `v1.2.3`, get a release. No manual steps.
- `GITHUB_TOKEN` is auto-provided — no secrets to configure unless publishing to an external registry.
- `fetch-depth: 0` is required for changelog generation (needs full git history).
- Tests run before packaging — a failing test blocks the release.
- The changelog is auto-generated from `git log` between the previous tag and the current tag.

## Node.js CLI tool (monorepo)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: <package-path>

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: <node-version>

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Get version
        id: version
        run: echo "version=$(node -p 'require(\"./package.json\").version')" >> "$GITHUB_OUTPUT"

      - name: Package release tarball
        run: |
          mkdir -p /tmp/package
          cp -r dist /tmp/package/
          cp package.json /tmp/package/
          cd /tmp/package
          npm install --production --ignore-scripts
          rm -rf node_modules/sharp/vendor
          cd ..
          tar -czf "$GITHUB_WORKSPACE/<tool-name>-${{ steps.version.outputs.version }}.tar.gz" -C /tmp/package .

      - name: Generate changelog
        id: changelog
        run: |
          PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREVIOUS_TAG" ]; then
            CHANGELOG=$(git log "$PREVIOUS_TAG"..HEAD --pretty=format:"- %s (%h)" --no-merges)
          else
            CHANGELOG=$(git log --pretty=format:"- %s (%h)" --no-merges -20)
          fi
          echo "changelog<<EOF" >> "$GITHUB_OUTPUT"
          echo "$CHANGELOG" >> "$GITHUB_OUTPUT"
          echo "EOF" >> "$GITHUB_OUTPUT"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: ${{ steps.version.outputs.version }}
          body: |
            ## Changes
            ${{ steps.changelog.outputs.changelog }}

            ## Install
            ```sh
            curl -fsSL https://raw.githubusercontent.com/${{ github.repository }}/<default-branch>/install.sh | sh
            ```
          files: |
            <tool-name>-${{ steps.version.outputs.version }}.tar.gz
```

Replace `<package-path>`, `<node-version>`, `<tool-name>`, and `<default-branch>` with actual values from the project.

### Non-monorepo adjustment

Remove the `defaults.run.working-directory` block. All `run:` steps execute at the repo root.

### The `sharp/vendor` cleanup

The `rm -rf node_modules/sharp/vendor` line removes platform-specific native binaries from the tarball. The install script re-installs them on the user's machine. Only include this line if the project depends on `sharp`.

## Node.js library (npm publish)

Replace the tarball and GitHub Release steps with:

```yaml
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Requires `NPM_TOKEN` secret to be configured in the repository settings. Add a `Setup Node.js` step with `registry-url: 'https://registry.npmjs.org'`.

## Go CLI tool

See `references/go.md` for cross-compile matrix and binary packaging.

## Verification

After writing the workflow:
1. `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))"` — validates YAML syntax.
2. Check that all `run:` commands match what actually works in the project (test locally).
3. Check that `<tool-name>` in the tarball filename matches what the install script expects.
