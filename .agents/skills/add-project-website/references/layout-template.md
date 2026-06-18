# Layout.astro Template

This is the standard layout wrapper. Update the description meta tag to match the project's tagline.

```astro
---
import "../styles/global.css";

interface Props {
  title: string;
}

const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="<TOOL_TAGLINE_HERE>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      rel="stylesheet"
    />
    <title>{title}</title>
  </head>
  <body class="bg-surface text-on-surface">
    <slot />
  </body>
</html>
```

## What this provides

- **Google Fonts**: Inter (body), Space Grotesk (headlines), Material Symbols Outlined (icons).
- **Preconnect hints**: For faster font loading.
- **Surface background**: Light grey (`bg-surface`) with dark text (`text-on-surface`) as the default.
- **Title prop**: Pass a page title from each page component.

## Fonts loaded

| Font | Weight | Usage |
|------|--------|-------|
| Inter | 400, 500, 600 | Body text, labels |
| Space Grotesk | 400, 500, 600, 700, 800 | Headlines, tool name |
| Material Symbols Outlined | variable | Icons throughout the page |
