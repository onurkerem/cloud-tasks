# Design Tokens — Tailwind v4 Theme System

This is the complete design token system for the project website. Use these as a baseline and adapt the accent color to the project.

## Color System

The color system uses a surface-based approach inspired by Material Design 3, but with a deliberately muted palette. The overall feeling should be "technical document" not "marketing page."

### Surface Colors (keep as-is)
These form the background layers — subtle greys with a very slight warm/cool tint:

```css
--color-background: #f9f9f9;
--color-surface: #f9f9f9;
--color-surface-bright: #f9f9f9;
--color-surface-dim: #d3dbdd;
--color-surface-variant: #dde4e5;
--color-surface-container: #ebeeef;
--color-surface-container-low: #f2f4f4;
--color-surface-container-lowest: #ffffff;
--color-surface-container-high: #e4e9ea;
--color-surface-container-highest: #dde4e5;
--color-surface-tint: #5e5e5e;
```

### On-Surface Colors (keep as-is)
Text colors on surface backgrounds:

```css
--color-on-background: #2d3435;
--color-on-surface: #2d3435;
--color-on-surface-variant: #596061;
```

### Primary — Grey (keep as-is)
Used for icon hover backgrounds and subtle emphasis:

```css
--color-primary: #5e5e5e;
--color-primary-dim: #525252;
--color-primary-container: #e2e2e2;
--color-primary-fixed: #e2e2e2;
--color-primary-fixed-dim: #d4d4d4;
--color-on-primary: #f8f8f8;
--color-on-primary-container: #525252;
--color-on-primary-fixed: #3f3f3f;
--color-on-primary-fixed-variant: #5b5b5b;
```

### Secondary — Blue-Grey (keep as-is)
Available for secondary elements but not heavily used:

```css
--color-secondary: #56606e;
--color-secondary-dim: #4a5462;
--color-secondary-container: #d9e3f4;
--color-secondary-fixed: #d9e3f4;
--color-secondary-fixed-dim: #cbd5e6;
--color-on-secondary: #f7f9ff;
--color-on-secondary-container: #485260;
--color-on-secondary-fixed: #36404d;
--color-on-secondary-fixed-variant: #525c6a;
```

### Tertiary — Accent Color (ADAPT THIS)
This is the project's accent. The default is a deep green (#006d4a), used for checkmarks, terminal prompts, and interactive highlights. Change this to match the project's identity:

```css
--color-tertiary: #006d4a;
--color-tertiary-dim: #005f40;
--color-tertiary-container: #69f6b8;
--color-tertiary-fixed: #69f6b8;
--color-tertiary-fixed-dim: #58e7ab;
--color-on-tertiary: #e6ffee;
--color-on-tertiary-container: #005a3c;
--color-on-tertiary-fixed: #00452d;
--color-on-tertiary-fixed-variant: #006544;
```

To adapt the accent: pick one strong, saturated color that represents the project. Generate the full tonal palette (container, fixed, dim variants) by adjusting lightness while keeping the hue. The base color should be dark enough for small text (WCAG AA on white) and the container should be a very light tint for background use.

### Error (keep as-is)
```css
--color-error: #9e3f4e;
--color-error-dim: #4f0116;
--color-error-container: #ff8b9a;
--color-on-error: #fff7f7;
--color-on-error-container: #782232;
```

### Inverse (keep as-is)
Used for terminal/dark components:

```css
--color-inverse-surface: #0c0f0f;
--color-inverse-on-surface: #9c9d9d;
--color-inverse-primary: #ffffff;
```

### Outline (keep as-is)
```css
--color-outline: #757c7d;
--color-outline-variant: #acb3b4;
```

## Typography

```css
--font-headline: "Space Grotesk", sans-serif;
--font-body: "Inter", sans-serif;
--font-label: "Inter", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

## Base Styles

```css
body {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6, .font-headline {
  font-family: var(--font-headline);
}

::selection {
  background-color: var(--color-tertiary);
  color: var(--color-on-tertiary);
}
```

## How to Generate an Accent Palette

If you need to change the tertiary (accent) color from green to something else (e.g., blue, orange, purple):

1. Pick your base hue (e.g., blue → hue 220)
2. `tertiary`: saturation 70-80%, lightness 35-45% — the main accent, visible but not shouting
3. `tertiary-container`: saturation 60-70%, lightness 85-90% — very light tint for backgrounds
4. `tertiary-fixed`: same as container or slightly more saturated
5. `tertiary-dim`: slightly darker and less saturated than tertiary
6. `on-tertiary`: near-white, for text on tertiary backgrounds
7. `on-tertiary-container`: dark version of the hue, for text on container backgrounds

The key is restraint. Even the accent should feel calm and technical.
