# Sections Guide — index.astro

Detailed guidance for each section of the single-page marketing site. Use these patterns and adapt the content to the project.

## Table of Contents

1. [Hero Section ("The Overhang")](#hero-section)
2. [Features Section](#features-section)
3. [Usage Section](#usage-section)
4. [Mapping/Flow Section](#mappingflow-section)
5. [Setup/Config Section](#setupconfig-section)
6. [Terminal Component Pattern](#terminal-component-pattern)
7. [Copy Button Script](#copy-button-script)

---

## Hero Section

The hero has three layers: the text content, the terminal component, and a faint grid background. The terminal "overhangs" into the next section using negative margin, creating visual depth.

```astro
<header class="pt-32 pb-24 px-8 relative overflow-hidden bg-surface-bright flex flex-col items-center text-center border-b border-surface-container-low">
  <div class="max-w-4xl mx-auto relative z-10">
    <h1 class="text-6xl md:text-8xl font-headline font-extrabold tracking-tighter text-on-surface mb-6 leading-none">
      <!-- TOOL NAME -->
    </h1>
    <p class="text-xl md:text-2xl font-body text-on-surface-variant max-w-2xl mx-auto mb-12 font-light">
      <!-- ONE-LINE TAGLINE -->
    </p>

    <!-- Terminal Component (see pattern below) -->
    <div class="... relative -mb-16 z-20">
      <!-- terminal content -->
    </div>
  </div>

  <!-- Grid background -->
  <div
    class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none opacity-[0.03]"
    style="background-image: linear-gradient(#2d3435 1px, transparent 1px), linear-gradient(90deg, #2d3435 1px, transparent 1px); background-size: 64px 64px;"
  >
  </div>
</header>
```

Key details:
- `pt-32 pb-24` — generous padding, the page breathes.
- `-mb-16 z-20` on the terminal — this is the overhang. It pushes the terminal down into the next section.
- The grid background is barely visible (`opacity-[0.03]`) — it adds texture without distraction.
- The next section needs `mt-16` to compensate for the overhang.

## Features Section

Three-column grid of feature cards. Determine the features by reading the project's README, CLI flags, and source code.

```astro
<section class="py-32 px-8 bg-surface-container-low mt-16" id="features">
  <div class="max-w-7xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-headline font-bold mb-16 text-center text-on-surface tracking-tight">
      <!-- Section title, e.g. "Core Capabilities" -->
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- For each feature: -->
      <div class="bg-surface-container-lowest p-8 border border-surface-container-highest transition-colors hover:border-outline-variant/30 group">
        <div class="w-12 h-12 bg-surface-container flex items-center justify-center rounded mb-6 text-on-surface group-hover:bg-primary group-hover:text-on-primary transition-colors">
          <span class="material-symbols-outlined"><!-- ICON_NAME --></span>
        </div>
        <h3 class="text-xl font-headline font-bold mb-3 text-on-surface"><!-- FEATURE TITLE --></h3>
        <p class="font-body text-on-surface-variant leading-relaxed">
          <!-- FEATURE DESCRIPTION — one or two sentences, derived from the actual tool behavior -->
        </p>
      </div>
    </div>
  </div>
</section>
```

Key details:
- Cards have no border-radius — sharp corners match the technical aesthetic.
- The icon container transitions from surface grey to primary on hover (`group-hover:bg-primary group-hover:text-on-primary`).
- Use Material Symbols Outlined icon names (e.g., `description`, `sync`, `track_changes`, `terminal`, `security`, `speed`).

## Usage Section

Two-column layout: left side has description with checkmark bullets, right side has a dark terminal with example commands.

```astro
<section class="py-32 px-8 bg-surface border-y border-surface-container-low" id="usage">
  <div class="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
    <div class="w-full lg:w-1/2">
      <h2 class="text-3xl md:text-4xl font-headline font-bold mb-6 text-on-surface tracking-tight">Usage</h2>
      <p class="font-body text-lg text-on-surface-variant mb-8 leading-relaxed">
        <!-- OVERVIEW OF HOW TO USE THE TOOL -->
      </p>
      <div class="space-y-4">
        <!-- For each bullet point: -->
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-tertiary mt-1">check_circle</span>
          <p class="font-body text-on-surface-variant"><!-- BULLET TEXT --></p>
        </div>
      </div>
    </div>
    <div class="w-full lg:w-1/2">
      <!-- Terminal Component with examples (see pattern below) -->
    </div>
  </div>
</section>
```

Key details:
- `check_circle` icons in tertiary color for the bullet points.
- Example commands should come from the project's actual CLI — read the flag parsing code to get exact syntax.

## Mapping/Flow Section

Use this when the tool transforms input to output (e.g., local files → Confluence pages, YAML → Kubernetes resources, source code → compiled output). Shows a visual side-by-side comparison.

```astro
<section class="py-32 px-8 bg-surface-container-low" id="sync-guide">
  <div class="max-w-5xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-headline font-bold mb-8 text-center text-on-surface tracking-tight">
      <!-- Section title -->
    </h2>
    <p class="font-body text-lg text-on-surface-variant mb-16 text-center max-w-3xl mx-auto">
      <!-- Brief explanation of the mapping -->
    </p>
    <div class="bg-surface-container-lowest p-12 border border-surface-container-highest flex flex-col md:flex-row gap-12 items-stretch">
      <!-- Left: Input structure -->
      <div class="flex-1">
        <h4 class="font-headline font-bold text-on-surface mb-6 border-b border-surface-container-highest pb-2"><!-- INPUT LABEL --></h4>
        <!-- Visual representation of input -->
      </div>
      <!-- Connector -->
      <div class="hidden md:flex flex-col items-center justify-center text-surface-container-highest">
        <div class="h-full w-px bg-surface-container-highest"></div>
        <div class="bg-surface-container-lowest p-2 border border-surface-container-highest rounded-full my-4 flex items-center justify-center">
          <span class="material-symbols-outlined text-on-surface-variant leading-none">arrow_forward</span>
        </div>
        <div class="h-full w-px bg-surface-container-highest"></div>
      </div>
      <!-- Right: Output structure -->
      <div class="flex-1">
        <h4 class="font-headline font-bold text-on-surface mb-6 border-b border-surface-container-highest pb-2"><!-- OUTPUT LABEL --></h4>
        <!-- Visual representation of output -->
      </div>
    </div>
  </div>
</section>
```

Key details:
- The connector between input and output uses a vertical line + arrow + vertical line pattern.
- Use Material Symbols `folder`, `description`, `article`, `folder_open` icons for file tree representations.
- Indentation with `ml-4`, `ml-6`, `ml-8` creates the tree hierarchy.

## Setup/Config Section

Use this when the tool requires configuration. Show the config file format in a code block.

```astro
<section class="py-32 px-8 bg-surface" id="setup">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-3xl md:text-4xl font-headline font-bold mb-6 text-on-surface tracking-tight">
      <!-- Section title, e.g. "Simple Configuration" -->
    </h2>
    <p class="font-body text-lg text-on-surface-variant mb-12">
      <!-- Brief instruction, including the config file path -->
    </p>
    <div class="bg-surface-container-low p-8 border border-outline-variant/15 text-left inline-block w-full max-w-2xl">
      <pre class="font-mono text-sm text-on-surface overflow-x-auto"><code set:html={configJson} /></pre>
    </div>
    <!-- If there are external links for credentials/tokens: -->
    <p class="font-body text-sm text-on-surface-variant mt-6">
      <!-- Link text with open_in_new icon -->
    </p>
  </div>
</section>
```

Key details:
- Define config examples in Astro frontmatter as a string variable, then render with `set:html` to avoid escaping issues.
- Links to external pages use a styled inline code element with the `open_in_new` icon.

## Terminal Component Pattern

Two styles: the hero terminal (larger, with copy button) and inline terminals (simpler, no copy button).

### Hero Terminal
```astro
<div class="bg-inverse-surface rounded-lg max-w-2xl mx-auto text-left shadow-[0px_24px_48px_rgba(45,52,53,0.15)] ring-1 ring-white/10 relative -mb-16 z-20">
  <!-- Title bar with traffic lights and copy button -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
      <div class="w-3 h-3 rounded-full bg-[#febc2e]"></div>
      <div class="w-3 h-3 rounded-full bg-[#28c840]"></div>
    </div>
    <span class="text-xs font-mono text-on-surface-variant/40 tracking-wide">bash</span>
    <button class="flex items-center gap-1 text-on-surface-variant/40 hover:text-inverse-on-surface transition-colors cursor-pointer p-1 rounded hover:bg-white/[0.08]" title="Copy to clipboard" id="hero-copy-btn">
      <span class="material-symbols-outlined text-base">content_copy</span>
    </button>
  </div>
  <!-- Command content -->
  <div class="px-6 py-5">
    <code class="font-mono text-base leading-relaxed break-all block">
      <span class="text-tertiary-fixed select-none">$ </span><!-- SYNTAX HIGHLIGHTED COMMAND -->
    </code>
  </div>
</div>
```

### Inline Terminal
```astro
<div class="bg-inverse-surface rounded-lg p-6 text-left shadow-[0px_24px_48px_rgba(45,52,53,0.06)] ring-1 ring-white/10 w-full">
  <div class="flex items-center justify-between mb-4 border-b border-surface-variant/20 pb-2">
    <span class="text-xs font-mono text-on-surface-variant uppercase tracking-widest">Terminal</span>
  </div>
  <div class="font-mono text-sm space-y-4">
    <!-- For each example: -->
    <div>
      <span class="text-on-surface-variant opacity-70"># COMMENT</span><br />
      <span class="text-tertiary-fixed">$</span> <span class="text-inverse-on-surface">COMMAND</span>
    </div>
  </div>
</div>
```

### Syntax Highlighting Colors
- `$` prompt: `text-tertiary-fixed` (accent color)
- Command names (curl, bash, tool-name): `text-[#8b9cf7]` (soft purple)
- Flags: `text-on-surface-variant/70`
- URLs/arguments: `text-inverse-on-surface`
- Comments: `text-on-surface-variant opacity-70`

## Copy Button Script

Add this at the end of `index.astro` if the hero has a copy button:

```astro
<script>
  document.getElementById("hero-copy-btn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget as HTMLElement;
    const code = `<!-- THE INSTALL COMMAND TO COPY -->`;
    await navigator.clipboard.writeText(code);
    const icon = btn.querySelector(".material-symbols-outlined");
    if (icon) {
      icon.textContent = "check";
      setTimeout(() => { icon.textContent = "content_copy"; }, 2000);
    }
  });
</script>
```

The icon swaps from `content_copy` to `check` for 2 seconds as visual confirmation.
