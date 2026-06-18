---
name: add-project-website
description: Add a polished Astro marketing website to any CLI or developer tool project. Use this skill whenever the user wants to create a landing page, marketing site, or documentation website for their CLI tool, library, or developer utility — especially when they mention Astro, Tailwind, a monorepo structure, or want a single-page site to explain their project. Also trigger when the user says "add a website to my project", "create a landing page", "I need a marketing site for my tool", or wants to convert their standalone project into a monorepo with a website package. Even if they just say "I want a website for my CLI" or "give my tool a homepage", use this skill.
---

# Add Project Website

You are converting a standalone project into a monorepo with an Astro marketing website. The pattern: the original project moves into `packages/cli/` (or its existing package name), and a new `packages/website/` is created alongside it.

## Phase 1: Explore and Understand

Before writing any code, thoroughly explore the target project to understand what it does and how to present it.

### Read project context
1. Read the root `AGENTS.md` and `CLAUDE.md` if they exist — these contain project-specific instructions that override defaults.
2. Read the project's `README.md` to understand what the tool does.
3. Look for any install scripts (`install.sh`, `Makefile`, etc.) to understand how users install the tool.
4. Identify the tool's name, its primary function, key features, and how users interact with it (CLI flags, config files, etc.).
5. Check the project's existing `package.json`, `go.mod`, `Cargo.toml`, or equivalent to understand the tech stack.

### Determine website content
Based on the exploration, decide what sections the single-page site needs. Every site gets these core sections:
- **Hero**: Tool name, one-line tagline, installation command in a terminal component.
- **Features**: 3-column grid of the tool's key capabilities.
- **Usage**: Two-column layout with description on one side and terminal examples on the other.

Then add specialized sections based on what the tool does:
- If it syncs/uploads/transfers anywhere → add a **mapping/flow diagram section** showing input vs output.
- If it has a config file → add a **configuration section** showing the config format.
- If it integrates with external services → add a **setup section** with links to credential pages.

## Phase 2: Confirm Plan with User

Before writing any code, present a brief plan to the user and ask for confirmation. This avoids surprises and lets the user steer decisions. Cover these points:

### What to ask
1. **Section plan**: "Based on the project, I'm planning these sections: [list]. Does that look right, or would you add/remove any?"
2. **Accent color**: "What accent color should the site use? The default is [inferred from project logo/readme, or muted green]. Or pick something else."
3. **Site URL**: "What domain will the site live at? (Used in `astro.config.ts` for canonical URLs and SEO.)"
4. **Install command**: "I'll show this install command in the hero: `[inferred command]`. Correct?"
5. **Monorepo restructuring** (only if not already a monorepo): "I'll move the existing source into `packages/cli/` and add `packages/website/`. This changes import paths. OK to proceed?"

### How to ask
Don't ask all five as a wall of questions. Group related decisions naturally — present the section plan and accent color together (they're about content/design), then confirm the structural decisions (monorepo move, site URL). Two rounds of questions is usually enough.

If the user already provided some of this information in their request (e.g., "use blue" or "the site is at mytool.dev"), don't ask again — just confirm you're using what they said.

Skip questions entirely only if the user explicitly says "just go ahead" or the context makes their intent unambiguous.

## Phase 3: Create Monorepo Structure

### Move existing project into packages/
If the project isn't already a monorepo:
1. Create `packages/` directory.
2. Move the project's source into an appropriate subdirectory (e.g., `packages/cli/` for a CLI tool). Actually move the files — don't just note that they should move.
3. Keep root-level files like `README.md`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `.gitignore` at the root.
4. Update any import paths, module names, or references that changed due to the move (e.g., Go module paths in `go.mod`, relative imports in Python).
5. Verify the project still builds/runs after the move.

If the project is already a monorepo with existing packages (e.g., `packages/api/` + `packages/cli/`), don't restructure anything — just add `packages/website/` alongside the existing packages.

### Create packages/website/
```
packages/website/
├── astro.config.ts
├── package.json
├── tsconfig.json
├── CLAUDE.md          # points to @AGENTS.md
├── AGENTS.md
├── README.md
└── src/
    ├── layouts/
    │   └── Layout.astro
    ├── pages/
    │   └── index.astro
    └── styles/
        └── global.css
```

## Phase 4: Website Files

Create these files exactly in this structure. The details for each file are below — adapt the content to the project you're working on.

### package.json
```json
{
  "name": "website",
  "version": "1.0.0",
  "description": "Marketing website for <tool-name>.",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "@astrojs/check": "^0.9.8",
    "@tailwindcss/vite": "^4.2.2",
    "astro": "^6.1.8",
    "tailwindcss": "^4.2.2",
    "typescript": "^5.9.3"
  }
}
```

### astro.config.ts
Replace the `site` URL with the project's actual domain or GitHub Pages URL:
```typescript
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://<project-domain>",
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### tsconfig.json
```json
{
  "extends": "astro/tsconfigs/strict"
}
```

### global.css — The Design System
This is the visual identity. Use Tailwind v4's `@theme` directive to define a complete color and type system. The style is deliberately restrained — muted greys and a single accent color. No gradients, no drop shadows (except on terminal components), no rounded corners on cards.

Read `references/design-tokens.md` for the full token system. Adapt the accent color to match the project's identity, but keep the surface system and overall muted aesthetic. The key principle: the design should feel like a technical document that happens to be beautiful, not a marketing page that happens to explain a tool.

Fonts:
- Headlines: **Space Grotesk** — geometric, slightly brutalist.
- Body: **Inter** — clean, highly legible.
- Mono: system monospace stack.

### Layout.astro
A minimal wrapper that loads fonts, sets meta tags, and applies the surface background. See `references/layout-template.md` for the exact template. Update the description meta tag to match the project's tagline.

### index.astro — The Main Page
This is a single-file page with all content. No component files, no routing. Everything lives in one `.astro` file. Read `references/sections-guide.md` for detailed guidance on each section.

The page structure follows this pattern:

1. **Hero ("The Overhang")** — The hero terminal component uses negative margin (`-mb-16 z-20`) to visually bridge into the next section. This "overhang" creates depth without shadows. The terminal shows the install command with a copy-to-clipboard button.

2. **Features** — Three-column card grid. Each card has a Material Symbols icon that transitions to primary color on hover. Cards use `bg-surface-container-lowest` with `border border-surface-container-highest`.

3. **Usage** — Two-column: left has descriptive text with checkmark bullets (tertiary green icons), right has a dark terminal showing example commands.

4. **Specialized sections** — Add based on the project's nature (see Phase 1).

5. **Setup/Config** (if applicable) — Centered config example in a code block.

## Phase 5: Update Project Documentation

After creating the website, update all documentation files:

### Root AGENTS.md
Add the website package to the repository structure diagram and the toolchain section. Add website dev/build commands. Add the guideline: **"Website changes are part of every feature"** — any change to CLI flags, config structure, or documented behavior must be reflected in the website.

### packages/website/AGENTS.md
```markdown
# packages/website — <tool-name> marketing site

Astro-based marketing website for <tool-name>.

## Stack
- Astro 6, Tailwind 4, TypeScript

## Commands
npm run dev / build / preview / check

## Structure
- src/pages/ — Astro pages
- src/layouts/ — layout components
- src/components/ — UI components
- src/styles/ — global styles
```

### packages/website/README.md
Brief setup instructions: prerequisites (Node.js), install (`npm install`), dev (`npm run dev`), build (`npm run build`).

### packages/website/CLAUDE.md
Just: `@AGENTS.md`

## Phase 6: Install and Verify

1. `cd packages/website && npm install`
2. `npm run dev` — verify the site starts and looks correct
3. Check the browser for: fonts loading, terminal component rendering, copy button working, responsive layout on narrow viewports
4. `npm run build` — verify no build errors

## Design Principles

- **Restraint over spectacle.** Muted colors, minimal decoration. The tool's functionality is the star.
- **No component files.** For a single-page marketing site, inlining everything in `index.astro` avoids unnecessary indirection. If the site grows beyond one page, then extract components.
- **Terminal components are the visual highlight.** Dark (`bg-inverse-surface`) rounded containers with macOS traffic lights, syntax-highlighted commands, and subtle ring borders. They break the monotony of the light surface backgrounds.
- **The overhang creates hierarchy.** The hero terminal bridging two sections is the signature visual move. Don't flatten it.
- **Content from the project, not invented.** Every feature description, command example, and config snippet must come from reading the actual project. Don't make up capabilities the tool doesn't have.
- **Material Symbols for icons.** Use Google's Material Symbols Outlined. They match the technical, restrained aesthetic.
- **Adapt the install command to the ecosystem.** Rust → `cargo install`, Python → `pip install`, Go → `go install`, Node → `npm install -g`. Show the actual command users would type.

## Important Reminders

- Check the latest Astro and Tailwind versions available — the versions in `package.json` above are a baseline. If newer stable versions exist, use them.
- Tailwind v4 uses `@import "tailwindcss"` and `@theme {}` in CSS — no `tailwind.config.js` file is needed.
- Tailwind v4 is loaded via the Vite plugin (`@tailwindcss/vite`), not a standalone config.
- The website and CLI are independent packages — no shared build tooling, no workspace config. They're coordinated through documentation.
- Always verify by running `npm run dev` and checking the browser before declaring the work done.
