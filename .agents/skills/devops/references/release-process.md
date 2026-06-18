# Release Process

How to cut a release for a project using tag-based GitHub Releases.

## Flow

1. **Bump version** in the project manifest (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.)
2. **Commit** with format: `release: vX.Y.Z`
3. **Tag** with semver: `vX.Y.Z`
4. **Push** commit and tags to remote

```sh
# Example for a Node.js project
# 1. Edit version in package.json manually or:
cd packages/cli && npm version patch --no-git-tag-version

# 2. Commit and tag
git add packages/cli/package.json
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z

# 3. Push (confirm with user first)
git push && git push --tags
```

## Version conventions

- Tags: `vMAJOR.MINOR.PATCH` (e.g., `v1.2.3`)
- No pre-release tags unless the project uses them explicitly
- Commit message: `release: vX.Y.Z`
- The version in the manifest must match the tag

## What happens after push

The `release.yml` workflow triggers on the `v*` tag push:
1. Tests run — if they fail, the release is blocked
2. Build runs — if it fails, the release is blocked
3. Tarball is packaged
4. Changelog is generated from `git log` between the previous tag and the current tag
5. GitHub Release is created with tarball + changelog

If the release fails, fix the issue and either:
- Delete the remote tag and re-push: `git push --delete origin vX.Y.Z && git tag -f vX.Y.Z && git push --tags`
- Or bump a new patch version

## Install command for README

```
curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<default-branch>/install.sh | sh
```

Pin a specific version:
```
VERSION=X.Y.Z curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<default-branch>/install.sh | sh
```

## Uninstall command for README

```
rm -rf ~/.<tool-name> /usr/local/bin/<tool-name>
```

## Monorepo version bump

In a monorepo, the version lives in the package's own manifest (e.g., `packages/cli/package.json`), not at the root. The commit should reference which package is being released.

```sh
git add packages/cli/package.json
git commit -m "release(cli): vX.Y.Z"
```

## Never push without confirmation

Always ask the user before running `git push` or `git push --tags`. The release is irreversible once the tag is pushed and the workflow starts.
