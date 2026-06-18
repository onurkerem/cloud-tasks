# .gitignore Templates

Create or improve the `.gitignore` based on the project's tech stack.

## Node.js

```
node_modules/
dist/
*.tgz
.DS_Store
.env
.env.*
!.env.example
```

For a monorepo, this lives at the root. Individual packages may add their own (e.g., `packages/website/.gitignore` for Astro cache).

Additional entries for common tools:
```
# Build outputs
build/
*.tsbuildinfo

# Test coverage
coverage/

# Package managers
.npm/
.yarn/

# IDE
.idea/
.vscode/
*.swp
```

## Go

```
# Binaries
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test binary
*.test

# Output
/dist/
/bin/

# Dependency directories
/vendor/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
```

