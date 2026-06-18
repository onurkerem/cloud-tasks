# Node.js DevOps Specifics

Node.js-specific details for DevOps configuration. Load this reference when the project uses Node.js/TypeScript.

## CI setup

- **Runtime:** `actions/setup-node@v4`
- **Node version:** Default to current LTS (22). Check the project's `engines` field for requirements.
- **Package manager:** `npm ci` for CI (faster and stricter than `npm install`). Requires `package-lock.json`.
- **Install step:** `npm ci` in the package directory

## Build

- `npm run build` — typically `tsc` for TypeScript projects
- Output directory: usually `dist/`
- Entry point: `dist/cli.js` for CLI tools (check `package.json` `bin` field)

## Test

- `npm test` — typically `vitest run` for Vitest projects
- Check `package.json` scripts to identify the test runner

## Release packaging

For CLI tools distributed via GitHub Releases:

1. Copy `dist/` and `package.json` to a temp directory
2. Run `npm install --production --ignore-scripts` to get production dependencies only
3. Remove platform-specific native binaries that the install script will re-install:
   - `rm -rf node_modules/sharp/vendor` (only if the project uses sharp)
4. Create tarball: `tar -czf <name>-<version>.tar.gz`
5. Upload as GitHub Release asset

## prepublishOnly guard

Add to `package.json` scripts to prevent accidental `npm publish` when distributing via GitHub Releases:

```json
"prepublishOnly": "echo 'This package is distributed via GitHub Releases only. Use the release workflow.' && exit 1"
```

Only add if the project should NOT be on npm. Omit if the project also publishes to the npm registry.

## npm publishing (for libraries)

If the project publishes to npm:

```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: <version>
          registry-url: 'https://registry.npmjs.org'

      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Requires `NPM_TOKEN` secret in repository settings.

## Monorepo considerations

- Set `defaults.run.working-directory` to the package path (e.g., `packages/cli`)
- The `npm ci` and `npm test` commands run within that working directory
- Version is extracted from the package's own `package.json`, not the root
- No workspace config needed — each package is independent

## Common package.json scripts

| Script | Purpose |
|---|---|
| `build` | Compile TypeScript to `dist/` |
| `test` | Run test suite |
| `test:watch` | Run tests in watch mode |
| `typecheck` | TypeScript type checking without emit |
| `lint` | Run linter (if configured) |
| `dev` | Run in development mode (usually via `tsx`) |
