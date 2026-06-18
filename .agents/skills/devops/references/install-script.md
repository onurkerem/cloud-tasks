# Install Script — Curl-based Installer

A POSIX sh script that downloads, extracts, and installs a tool from GitHub Releases. Only for distributable tools (CLI tools, desktop apps). Not for libraries or web apps.

## Principles

- POSIX sh — no bashisms. Must work on macOS, Linux, and WSL without modification.
- Version resolution: queries GitHub API for latest release, or accepts `VERSION` env var.
- Symlink to a writable bin directory (`/usr/local/bin` with `$HOME/.local/bin` fallback).
- Cleanup old versions automatically.
- Exit with clear error messages on every failure path.

## Template (Node.js CLI tool)

```sh
#!/usr/bin/env sh
set -e

REPO="<owner>/<repo>"
GITHUB_API="https://api.github.com/repos"
INSTALL_DIR="$HOME/.<tool-name>"
BIN_NAME="<tool-name>"

# --- Prerequisite checks ---

if ! command -v curl > /dev/null 2>&1; then
    echo "Error: curl is required but not installed."
    echo "Install it from: https://curl.se/dlwiz/"
    exit 1
fi

if ! command -v node > /dev/null 2>&1; then
    echo "Error: Node.js >= 18 is required but not installed."
    echo "Install it from: https://nodejs.org/"
    exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.version.split('.')[0].slice(1))")
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Error: Node.js >= 18 is required. You have v$(node -v)."
    echo "Upgrade at: https://nodejs.org/"
    exit 1
fi

# --- Resolve version ---

if [ -n "$VERSION" ]; then
    VERSION_NUM="${VERSION#v}"
    TAG="v$VERSION_NUM"
else
    echo "Looking up latest version..."
    TAG=$(curl -fsSL "$GITHUB_API/$REPO/releases/latest" 2>/dev/null | grep -m 1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')
    if [ -z "$TAG" ]; then
        echo "Error: Could not determine latest version."
        echo "Check the repository: https://github.com/$REPO"
        exit 1
    fi
    VERSION_NUM="${TAG#v}"
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$BIN_NAME-$VERSION_NUM.tar.gz"

# --- Download ---

TARGET_DIR="$INSTALL_DIR/versions/$VERSION_NUM"

echo "Installing $BIN_NAME $TAG..."

if [ -d "$TARGET_DIR" ]; then
    echo "Version $VERSION_NUM already installed. Reinstalling..."
    rm -rf "$TARGET_DIR"
fi

mkdir -p "$TARGET_DIR"

TMPFILE=$(mktemp "/tmp/$BIN_NAME.XXXXXX.tar.gz")
cleanup() { rm -f "$TMPFILE"; }
trap cleanup EXIT

echo "Downloading $DOWNLOAD_URL..."
if ! curl -fsSL -o "$TMPFILE" "$DOWNLOAD_URL"; then
    echo "Error: Download failed."
    echo "Download manually from: https://github.com/$REPO/releases/tag/$TAG"
    exit 1
fi

# --- Extract ---

echo "Extracting..."
tar -xzf "$TMPFILE" -C "$TARGET_DIR"

if [ ! -f "$TARGET_DIR/dist/cli.js" ]; then
    echo "Error: Expected entry point not found after extraction."
    exit 1
fi

# --- Install dependencies ---

echo "Installing dependencies..."
cd "$TARGET_DIR"
if ! npm install --production --ignore-scripts; then
    echo "Error: npm install failed."
    echo "Try running manually: cd $TARGET_DIR && npm install --production --verbose"
    exit 1
fi

# --- Symlink ---

if [ -w "/usr/local/bin" ]; then
    BIN_DIR="/usr/local/bin"
else
    BIN_DIR="$HOME/.local/bin"
    mkdir -p "$BIN_DIR"
    if ! echo "$PATH" | grep -Fq "$BIN_DIR"; then
        echo ""
        echo "Note: Add $BIN_DIR to your PATH:"
        echo "  echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.zshrc"
        echo "  source ~/.zshrc"
        echo ""
    fi
fi

LINK_TARGET="$BIN_DIR/$BIN_NAME"

if [ -L "$LINK_TARGET" ] || [ -e "$LINK_TARGET" ]; then
    rm -f "$LINK_TARGET"
fi

ln -s "$TARGET_DIR/dist/cli.js" "$LINK_TARGET"
chmod +x "$TARGET_DIR/dist/cli.js"

# --- Cleanup old versions ---

for dir in "$INSTALL_DIR/versions"/*; do
    if [ -d "$dir" ] && [ "$(basename "$dir")" != "$VERSION_NUM" ]; then
        echo "Removing old version $(basename "$dir")..."
        rm -rf "$dir"
    fi
done

# --- Done ---

echo ""
echo "Installed $BIN_NAME $TAG to $LINK_TARGET"
echo "Run: $BIN_NAME --help"
```

## Adaptations

### Go CLI tools

Remove the Node.js prerequisite checks and the `npm install --production` step. The binary is self-contained.

Change the entry point check:
```sh
if [ ! -f "$TARGET_DIR/$BIN_NAME" ]; then
    echo "Error: Expected binary not found after extraction."
    exit 1
fi
```

Change the symlink target:
```sh
ln -s "$TARGET_DIR/$BIN_NAME" "$LINK_TARGET"
chmod +x "$TARGET_DIR/$BIN_NAME"
```

For cross-platform support, detect OS and architecture:
```sh
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
[ "$ARCH" = "x86_64" ] && ARCH="amd64"
[ "$ARCH" = "aarch64" ] && ARCH="arm64"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$BIN_NAME-$VERSION_NUM-$OS-$ARCH.tar.gz"
```

## Things to verify after writing

1. `sh -n install.sh` — no syntax errors.
2. `chmod +x install.sh` — executable.
3. `grep '<' install.sh` — no placeholder values remain.
4. Entry point path matches what the release tarball actually contains.
5. `REPO` variable matches the actual GitHub owner/repo slug.
