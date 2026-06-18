# Go DevOps Specifics

Go-specific details for DevOps configuration. Load this reference when the project uses Go.

## CI setup

- **Runtime:** `actions/setup-go@v5`
- **Go version:** Default to latest stable. Check `go.mod` for the `go` directive.
- **Install step:** `go mod download`

## Build

```sh
go build -o <binary-name> .
```

Output is a single binary — no dependency installation needed on the user's machine.

## Test

```sh
go test ./...
```

## Release workflow — cross-compilation

Go CLI tools should cross-compile for multiple platforms. Use a matrix strategy:

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - goos: linux
            goarch: amd64
          - goos: linux
            goarch: arm64
          - goos: darwin
            goarch: amd64
          - goos: darwin
            goarch: arm64
          - goos: windows
            goarch: amd64

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-go@v5
        with:
          go-version: <go-version>

      - name: Test
        run: go test ./...

      - name: Build
        env:
          GOOS: ${{ matrix.goos }}
          GOARCH: ${{ matrix.goarch }}
        run: |
          BINARY=<tool-name>
          [ "$GOOS" = "windows" ] && BINARY="${BINARY}.exe"
          go build -o "$BINARY" .
          tar -czf "<tool-name>-${{ steps.version.outputs.version }}-${GOOS}-${GOARCH}.tar.gz" "$BINARY"

      - name: Upload release asset
        uses: softprops/action-gh-release@v2
        with:
          files: <tool-name>-*.tar.gz
```

### Alternative: single job with build matrix

For smaller projects, build all targets in one job:

```yaml
      - name: Build all platforms
        run: |
          for GOOS in linux darwin windows; do
            for GOARCH in amd64 arm64; do
              [ "$GOOS" = "windows" ] && EXT=".exe" || EXT=""
              BINARY="<tool-name>${EXT}"
              GOOS=$GOOS GOARCH=$GOARCH go build -o "dist/${BINARY}" .
              cd dist && tar -czf "../<tool-name>-$(cat ../version)-${GOOS}-${GOARCH}.tar.gz" "${BINARY}" && cd ..
            done
          done
```

## Install script adaptations

See `references/install-script.md` for the Go-specific install script. Key differences from Node.js:
- No Node.js prerequisite check
- No `npm install` step
- OS and architecture detection for downloading the correct binary
- Entry point is the binary itself, not `dist/cli.js`

## CI workflow

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

      - name: Build
        run: go build -v ./...
```
