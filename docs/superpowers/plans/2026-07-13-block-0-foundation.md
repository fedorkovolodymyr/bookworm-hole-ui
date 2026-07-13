# Block 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `bookworm-hole-ui` Next.js repo with CI, design tokens, a base shadcn/ui component kit with Storybook coverage, and an auth-aware app shell — the foundation every later Block builds on.

**Architecture:** Next.js 14 App Router project using pnpm, Tailwind CSS with CSS-variable-backed design tokens (light/dark), shadcn/ui primitives copied into `components/ui/`, Storybook 8 for isolated component review, Vitest + React Testing Library for unit/component tests, ESLint + Prettier + TypeScript strict for lint/format, and a GitHub Actions CI pipeline running lint → type-check → test → build on every push/PR.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS 3, shadcn/ui (Radix primitives), TanStack Query 5, axios, Storybook 8, Vitest + @testing-library/react, ESLint + Prettier, pnpm.

## Global Constraints

- Package manager: pnpm (per spec's Stack table) — no npm/yarn lockfiles.
- TypeScript strict mode required (spec: "Lint/format ... typescript strict").
- CI must run lint, type-check, test, and build on every push (spec: ".github/workflows/ci.yml: lint, type-check, test, build").
- Every base component ships a Storybook story from day one, covering default/disabled/loading/error variants where applicable (spec: "Design System (Block 0 deliverable)").
- Design tokens (color palette, typography scale, spacing, radii, shadows) live in `tailwind.config` theme, backed by CSS variables for light/dark mode (spec: "Design System (Block 0 deliverable)").
- API base URL for local dev is `http://localhost:8000/api/v1` (confirmed via sibling `bookworm-hole-api/.env.example`); API CORS already allows `http://localhost:3000`, so the UI dev server must run on port 3000 (Next.js default).
- Repo structure must match the spec's `Repo Structure` section exactly: `app/`, `components/ui/`, `components/<domain>/`, `lib/api/`, `lib/auth/`, `hooks/`, `styles/`, `tests/`, `.github/workflows/`.
- Out of scope for this plan: i18n, actual Vercel project creation/env config, any Block 1+ domain UI (auth pages beyond a placeholder shell, catalog, etc.).

---

## File Structure

```text
bookworm-hole-ui/
  app/
    layout.tsx                 # root layout: fonts, ThemeProvider, QueryProvider
    globals.css                 # Tailwind directives + CSS variable tokens
    page.tsx                    # temporary landing page (redirects/placeholder until Block 1)
    (auth)/
      layout.tsx                # minimal centered layout for login/register (placeholder)
    (app)/
      layout.tsx                # authenticated shell: Header + Sidebar/Nav + content slot
  components/
    ui/                         # shadcn/ui primitives (generated + hand-verified)
      button.tsx
      input.tsx
      textarea.tsx
      select.tsx
      checkbox.tsx
      card.tsx
      dialog.tsx
      dropdown-menu.tsx
      avatar.tsx
      badge.tsx
      toast.tsx / toaster.tsx / use-toast.ts
      tabs.tsx
      skeleton.tsx
      pagination.tsx
    layout/
      header.tsx                # app shell header/nav
      theme-toggle.tsx           # light/dark switch
  lib/
    utils.ts                    # cn() class merge helper (shadcn requirement)
    providers/
      query-provider.tsx         # TanStack Query client provider
      theme-provider.tsx         # next-themes provider wrapper
  styles/
    tokens.css                  # (folded into app/globals.css — see Task 3)
  tests/
    setup.ts                    # Vitest + RTL global setup (jest-dom matchers)
  .storybook/
    main.ts
    preview.tsx
  .github/
    workflows/
      ci.yml
  .eslintrc.json (or eslint.config.mjs, per create-next-app output)
  .prettierrc
  tailwind.config.ts
  tsconfig.json
  vitest.config.ts
  package.json
  pnpm-lock.yaml
  .env.example
  .gitignore
  README.md
```

Rationale: `lib/api/` and `hooks/` directories are created empty (with a `.gitkeep` or a stub `README.md`) in this Block since no domain client exists yet — Block 1 populates them. `components/<domain>/` is likewise not created until a domain exists.

---

## Task 1: Scaffold Next.js App with TypeScript, Tailwind, pnpm

**Files:**
- Create: entire base Next.js project (via `create-next-app`) at repo root — `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `.gitignore`
- Modify: `tsconfig.json` (enable strict mode explicitly if not default)

**Interfaces:**
- Produces: a running Next.js dev server on `localhost:3000`, `app/layout.tsx` exporting default `RootLayout({ children })`, Tailwind classes usable in any `.tsx` under `app/` and `components/`.

- [ ] **Step 1: Run create-next-app with pnpm**

```bash
cd /Users/fedvol/Documents/bookworm-hole
pnpm dlx create-next-app@latest bookworm-hole-ui \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias "@/*" --use-pnpm \
  --no-git
```

Note: `--no-git` avoids clobbering the existing `.git` directory (repo already initialized with the design spec commit). If the CLI still errors about an existing directory, run it into a temp dir and move generated files in, preserving `.git/` and `docs/`.

- [ ] **Step 2: Verify tsconfig strict mode**

Open `tsconfig.json`, confirm `"strict": true` is present under `compilerOptions`. `create-next-app --typescript` sets this by default — if missing, add it.

- [ ] **Step 3: Verify dev server boots**

Run: `pnpm dev`
Expected: server starts on `http://localhost:3000`, visiting it in a browser shows the default Next.js starter page. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 4: Remove starter boilerplate from app/page.tsx**

Replace the generated `app/page.tsx` with a minimal placeholder:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">Bookworm Hole</h1>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/fedvol/Documents/bookworm-hole/bookworm-hole-ui
git add -A
git commit -m "feat: scaffold Next.js app with TypeScript, Tailwind, pnpm"
```

---

## Task 2: ESLint + Prettier Configuration

**Files:**
- Modify: `.eslintrc.json` (or `eslint.config.mjs` if create-next-app emitted flat config)
- Create: `.prettierrc`, `.prettierignore`
- Modify: `package.json` (add `format`, `format:check`, `lint` scripts)

**Interfaces:**
- Produces: `pnpm lint` (ESLint check), `pnpm format` (Prettier write), `pnpm format:check` (Prettier check, used by CI).

- [ ] **Step 1: Install Prettier and the Tailwind class-sorting plugin**

```bash
pnpm add -D prettier prettier-plugin-tailwindcss eslint-config-prettier
```

- [ ] **Step 2: Write .prettierrc**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 3: Write .prettierignore**

```text
.next
node_modules
pnpm-lock.yaml
storybook-static
coverage
```

- [ ] **Step 4: Extend ESLint config with eslint-config-prettier**

For `.eslintrc.json`, add `"prettier"` as the last entry in `extends` so it disables stylistic rules that conflict with Prettier:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"]
}
```

- [ ] **Step 5: Add scripts to package.json**

```json
{
  "scripts": {
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [ ] **Step 6: Run lint and format checks**

Run: `pnpm lint`
Expected: `✔ No ESLint warnings or errors`

Run: `pnpm format:check`
Expected: `All matched files use Prettier code style!` (run `pnpm format` first if it reports mismatches, then re-check)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configure ESLint and Prettier"
```

---

## Task 3: Design Tokens (Colors, Typography, Spacing, Radii, Shadows) in Tailwind + CSS Variables

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Test: `tests/design-tokens.test.ts`

**Interfaces:**
- Produces: CSS variables `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, `--border`, `--input`, `--ring`, `--radius` defined in `:root` and `.dark`; Tailwind theme keys `colors.{background,foreground,primary,secondary,muted,accent,destructive,success,warning,border,input,ring}` (each with a `DEFAULT` and `foreground` sub-key where applicable), `borderRadius.{sm,md,lg}` derived from `--radius`.
- Consumes: nothing (first design-system task).

- [ ] **Step 1: Write the failing test asserting token CSS variables exist**

Vitest can't parse CSS files directly, so this test reads the raw file and asserts the required variable names are declared. This is a guard against someone deleting a token during future edits.

```ts
// tests/design-tokens.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const REQUIRED_TOKENS = [
  "--background",
  "--foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--success",
  "--success-foreground",
  "--warning",
  "--warning-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
];

describe("design tokens", () => {
  const css = readFileSync("app/globals.css", "utf-8");

  it("defines every required token in :root", () => {
    const rootBlockMatch = css.match(/:root\s*{([^}]*)}/);
    expect(rootBlockMatch).not.toBeNull();
    const rootBlock = rootBlockMatch![1];
    for (const token of REQUIRED_TOKENS) {
      expect(rootBlock).toContain(token);
    }
  });

  it("defines every color token override in .dark", () => {
    const darkBlockMatch = css.match(/\.dark\s*{([^}]*)}/);
    expect(darkBlockMatch).not.toBeNull();
    const darkBlock = darkBlockMatch![1];
    for (const token of REQUIRED_TOKENS.filter((t) => t !== "--radius")) {
      expect(darkBlock).toContain(token);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/design-tokens.test.ts`
Expected: FAIL — `app/globals.css` has no `:root` token block yet (Task 1's default Tailwind boilerplate CSS doesn't declare these variables).

- [ ] **Step 3: Write app/globals.css with token definitions**

Replace the contents of `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;

    --primary: 221 83% 53%;
    --primary-foreground: 0 0% 100%;

    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;

    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;

    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;

    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;

    --warning: 38 92% 50%;
    --warning-foreground: 240 10% 3.9%;

    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 221 83% 53%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;

    --primary: 217 91% 60%;
    --primary-foreground: 240 10% 3.9%;

    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;

    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;

    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;

    --success: 142 71% 35%;
    --success-foreground: 0 0% 98%;

    --warning: 38 92% 40%;
    --warning-foreground: 0 0% 98%;

    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 217 91% 60%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 4: Wire tokens into tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **Step 5: Install tailwindcss-animate (required by shadcn/ui components in Task 5)**

```bash
pnpm add -D tailwindcss-animate
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run tests/design-tokens.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add design tokens (color, radius) as CSS variables in light/dark"
```

---

## Task 4: Vitest + React Testing Library Setup

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`
- Modify: `package.json` (add `test`, `test:watch` scripts, add devDependencies)

**Interfaces:**
- Produces: `pnpm test` runs Vitest once in CI mode; `tests/setup.ts` registers `@testing-library/jest-dom` matchers globally, imported via `vitest.config.ts`'s `setupFiles`.
- Consumes: nothing new (Task 3's test already ran under a default Vitest config — this task formalizes it).

- [ ] **Step 1: Install test dependencies**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Write vitest.config.ts**

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Write tests/setup.ts**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test scripts to package.json**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Write a smoke test for the placeholder home page**

```tsx
// app/page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the app name", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /bookworm hole/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `@testing-library/jest-dom/vitest` matchers not yet wired without step 3, or `Home` import fails if Task 1's `app/page.tsx` doesn't match. Confirm the failure is only "not yet run" style (missing setup), not a real bug. If Task 1/3 already complete, this may actually pass on first run — if so, skip to Step 7 but verify by temporarily renaming the heading text and re-running to confirm the test *can* fail (regression-detection sanity check), then rename it back.

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — `app/page.test.tsx (1 test) ... Home > renders the app name`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: configure Vitest and React Testing Library"
```

---

## Task 5: Install shadcn/ui CLI and Generate Base Components

**Files:**
- Create: `components.json` (shadcn CLI config)
- Create: `lib/utils.ts`
- Create: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/checkbox.tsx`, `components/ui/card.tsx`, `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/avatar.tsx`, `components/ui/badge.tsx`, `components/ui/toast.tsx`, `components/ui/toaster.tsx`, `components/ui/use-toast.ts`, `components/ui/tabs.tsx`, `components/ui/skeleton.tsx`, `components/ui/pagination.tsx`
- Test: `components/ui/button.test.tsx` (representative — full per-component test coverage is Task 7)

**Interfaces:**
- Produces: `cn(...)` utility from `lib/utils.ts` (`cn(...inputs: ClassValue[]) => string`), and each `components/ui/*.tsx` exporting its named component(s) per shadcn's standard API (e.g. `Button`, `buttonVariants` from `button.tsx`; `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` from `card.tsx`).
- Consumes: design tokens from Task 3 (`bg-primary`, `text-primary-foreground`, etc.), Tailwind config's `borderRadius` scale.

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

When prompted, choose: TypeScript = yes, style = "Default", base color = "Slate" (closest to the neutral tokens already defined — the CLI will still respect the existing `tailwind.config.ts` colors since Task 3 already ran), CSS variables = yes, `tailwind.config.ts` path = detected automatically, `app/globals.css` path = detected automatically, import alias = `@/components`, `@/lib/utils`.

This creates `components.json` and `lib/utils.ts` (exporting `cn`).

- [ ] **Step 2: Verify lib/utils.ts content**

Confirm it matches:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

If the CLI produced something different, leave it — this is the standard shadcn output and later tasks depend on this exact export name/signature.

- [ ] **Step 3: Add each base component via the CLI**

```bash
pnpm dlx shadcn@latest add button input textarea select checkbox card dialog dropdown-menu avatar badge toast tabs skeleton pagination
```

This writes each file into `components/ui/` and installs their Radix peer dependencies (`@radix-ui/react-dialog`, `@radix-ui/react-select`, etc.) plus `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.

- [ ] **Step 4: Verify tailwind.config.ts wasn't reset**

Open `tailwind.config.ts` — the shadcn CLI sometimes rewrites this file. Confirm the `success` and `warning` color extensions from Task 3 Step 4 are still present (the CLI only knows shadcn's default token set: background, foreground, primary, secondary, muted, accent, destructive, border, input, ring, card, popover — it will add `card` and `popover` tokens which is fine, but re-add `success`/`warning` and their CSS variables in `app/globals.css` if the CLI stripped them).

- [ ] **Step 5: Write a smoke test for Button**

```tsx
// components/ui/button.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders children and responds to variant prop", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: /delete/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-destructive");
  });

  it("renders as disabled when disabled prop is set", () => {
    render(<Button disabled>Submit</Button>);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run components/ui/button.test.tsx`
Expected: FAIL only if `components/ui/button.tsx` doesn't exist yet — since Step 3 already generated it, this should actually PASS. Run it anyway to confirm the file wires up correctly; if it fails for any other reason (import path, missing dep), fix before proceeding.

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm vitest run components/ui/button.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 8: Run full test suite and lint to confirm nothing broke**

Run: `pnpm test && pnpm lint`
Expected: all tests PASS, no lint errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui base component kit"
```

---

## Task 6: Storybook Setup

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.tsx`
- Modify: `package.json` (add `storybook`, `build-storybook` scripts)

**Interfaces:**
- Produces: `pnpm storybook` launches Storybook dev server on port 6006; `.storybook/preview.tsx` exports a `decorators` array that wraps every story in the same `ThemeProvider` used by `app/layout.tsx` (created in Task 8), so dark-mode stories render correctly; a global "background" toolbar to preview light/dark.
- Consumes: `app/globals.css` (Task 3) for token styling inside story iframes.

- [ ] **Step 1: Install Storybook**

```bash
pnpm dlx storybook@latest init --type nextjs
```

Accept defaults (Vite builder is auto-selected for Next.js by the initializer as of Storybook 8; if prompted, choose the Next.js framework preset which auto-configures the Next.js-specific webpack/vite integration, App Router support, and image handling).

- [ ] **Step 2: Import global CSS into preview**

Edit `.storybook/preview.tsx` to import Tailwind/tokens so components render styled:

```tsx
import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

- [ ] **Step 3: Verify Storybook boots**

Run: `pnpm storybook`
Expected: dev server starts on `http://localhost:6006`, browser shows the Storybook welcome/example stories with Tailwind-styled example components (no unstyled flash of content). Stop the server once confirmed.

- [ ] **Step 4: Remove Storybook's example stories**

Delete the boilerplate `stories/` directory the initializer generated (e.g. `Button.stories.tsx`, `Header.stories.tsx`, `Page.stories.tsx` and their supporting components) — Task 7 adds real stories co-located with each `components/ui/*.tsx` file instead.

```bash
rm -rf stories
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: set up Storybook"
```

---

## Task 7: Storybook Stories for Every Base Component

**Files:**
- Create: `components/ui/button.stories.tsx`, `components/ui/input.stories.tsx`, `components/ui/textarea.stories.tsx`, `components/ui/select.stories.tsx`, `components/ui/checkbox.stories.tsx`, `components/ui/card.stories.tsx`, `components/ui/dialog.stories.tsx`, `components/ui/dropdown-menu.stories.tsx`, `components/ui/avatar.stories.tsx`, `components/ui/badge.stories.tsx`, `components/ui/toast.stories.tsx`, `components/ui/tabs.stories.tsx`, `components/ui/skeleton.stories.tsx`, `components/ui/pagination.stories.tsx`

**Interfaces:**
- Consumes: each component export from its sibling `.tsx` file (Task 5).
- Produces: nothing consumed by later tasks — these are leaf deliverables (Storybook's own build just needs each file to export a default `Meta` and one-or-more named `StoryObj` exports).

Each component gets `default`/`disabled`/`loading`/`error` variants **where that state applies to the component** (a `Badge` has no "loading" state; a `Skeleton` has no "disabled" state — cover what's meaningful for the component).

- [ ] **Step 1: Button stories (default, disabled, loading, error/destructive)**

```tsx
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Loader2 } from "lucide-react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "Button", variant: "default" },
};

export const Disabled: Story = {
  args: { children: "Button", disabled: true },
};

export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Please wait
    </Button>
  ),
};

export const Destructive: Story = {
  args: { children: "Delete", variant: "destructive" },
};
```

- [ ] **Step 2: Input stories (default, disabled, error)**

```tsx
// components/ui/input.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Email address" },
};

export const Disabled: Story = {
  args: { placeholder: "Email address", disabled: true },
};

export const ErrorState: Story = {
  args: { placeholder: "Email address", "aria-invalid": true, className: "border-destructive" },
};
```

- [ ] **Step 3: Textarea stories (default, disabled)**

```tsx
// components/ui/textarea.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: { placeholder: "Write a review..." },
};

export const Disabled: Story = {
  args: { placeholder: "Write a review...", disabled: true },
};
```

- [ ] **Step 4: Select stories (default, disabled)**

```tsx
// components/ui/select.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="title">Title</SelectItem>
        <SelectItem value="author">Author</SelectItem>
        <SelectItem value="date">Date added</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="title">Title</SelectItem>
      </SelectContent>
    </Select>
  ),
};
```

- [ ] **Step 5: Checkbox stories (default, disabled, checked)**

```tsx
// components/ui/checkbox.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
```

- [ ] **Step 6: Card stories (default, with footer)**

```tsx
// components/ui/card.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>The Fellowship of the Ring</CardTitle>
        <CardDescription>J.R.R. Tolkien</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">First volume of The Lord of the Rings.</p>
      </CardContent>
      <CardFooter>
        <Button>Add to collection</Button>
      </CardFooter>
    </Card>
  ),
};
```

- [ ] **Step 7: Dialog stories (default)**

```tsx
// components/ui/dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Delete account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your account.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};
```

- [ ] **Step 8: Dropdown menu stories (default)**

```tsx
// components/ui/dropdown-menu.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";

const meta: Meta<typeof DropdownMenu> = {
  title: "UI/DropdownMenu",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Edit profile</DropdownMenuItem>
        <DropdownMenuItem>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
```

- [ ] **Step 9: Avatar stories (default, fallback)**

```tsx
// components/ui/avatar.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="User avatar" />
      <AvatarFallback>BH</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>BH</AvatarFallback>
    </Avatar>
  ),
};
```

- [ ] **Step 10: Badge stories (default, secondary, destructive, outline)**

```tsx
// components/ui/badge.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: "New", variant: "default" } };
export const Secondary: Story = { args: { children: "Draft", variant: "secondary" } };
export const Destructive: Story = { args: { children: "Overdue", variant: "destructive" } };
export const Outline: Story = { args: { children: "Archived", variant: "outline" } };
```

- [ ] **Step 11: Toast stories (default, error)**

```tsx
// components/ui/toast.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "./toast";

const meta: Meta<typeof Toast> = {
  title: "UI/Toast",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Toast open>
        <div className="grid gap-1">
          <ToastTitle>Added to collection</ToastTitle>
          <ToastDescription>The Fellowship of the Ring was added.</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <ToastProvider>
      <Toast open variant="destructive">
        <div className="grid gap-1">
          <ToastTitle>Something went wrong</ToastTitle>
          <ToastDescription>Could not save your review. Try again.</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};
```

- [ ] **Step 12: Tabs stories (default)**

```tsx
// components/ui/tabs.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="reading" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="reading">Reading</TabsTrigger>
        <TabsTrigger value="finished">Finished</TabsTrigger>
      </TabsList>
      <TabsContent value="reading">Books currently in progress.</TabsContent>
      <TabsContent value="finished">Books you've completed.</TabsContent>
    </Tabs>
  ),
};
```

- [ ] **Step 13: Skeleton stories (loading state)**

```tsx
// components/ui/skeleton.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const CardLoading: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};
```

- [ ] **Step 14: Pagination stories (default)**

```tsx
// components/ui/pagination.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

const meta: Meta<typeof Pagination> = {
  title: "UI/Pagination",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
```

- [ ] **Step 15: Build Storybook to verify every story compiles**

Run: `pnpm build-storybook`
Expected: build completes with `webpack compiled successfully` (or Vite equivalent) and no story errors reported; exits code 0.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "docs: add Storybook stories for every base component"
```

---

## Task 8: Theme Provider (Light/Dark Mode)

**Files:**
- Create: `lib/providers/theme-provider.tsx`
- Create: `components/layout/theme-toggle.tsx`
- Modify: `app/layout.tsx`
- Test: `components/layout/theme-toggle.test.tsx`

**Interfaces:**
- Produces: `ThemeProvider` component (wraps `next-themes`'s `ThemeProvider`, `attribute="class"`, `defaultTheme="system"`, `enableSystem`), `ThemeToggle` component exporting default function using `useTheme()` from `next-themes` to flip between `"light"`/`"dark"`.
- Consumes: `Button` from `components/ui/button.tsx` (Task 5), `.dark` CSS variable overrides from Task 3.

- [ ] **Step 1: Install next-themes**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Write lib/providers/theme-provider.tsx**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 3: Write the failing test for ThemeToggle**

```tsx
// components/layout/theme-toggle.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("toggles the html class between light and dark on click", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggle = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(toggle);

    expect(document.documentElement.className).toContain("dark");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm vitest run components/layout/theme-toggle.test.tsx`
Expected: FAIL with `Cannot find module './theme-toggle'`

- [ ] **Step 5: Write components/layout/theme-toggle.tsx**

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 scale-100 dark:scale-0" />
      <Moon className="absolute h-5 w-5 scale-0 dark:scale-100" />
    </Button>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run components/layout/theme-toggle.test.tsx`
Expected: PASS

- [ ] **Step 7: Wire ThemeProvider into app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bookworm Hole",
  description: "Track what you read.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` is required by `next-themes` because it sets the `class` attribute client-side before hydration.

- [ ] **Step 8: Run full test suite**

Run: `pnpm test`
Expected: all tests PASS, including the earlier `app/page.test.tsx` (verify `RootLayout` changes didn't break the `Home` render — `Home` is tested standalone without `RootLayout`, so this should be unaffected).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add light/dark theme provider and toggle"
```

---

## Task 9: TanStack Query Provider

**Files:**
- Create: `lib/providers/query-provider.tsx`
- Modify: `app/layout.tsx`
- Test: `lib/providers/query-provider.test.tsx`

**Interfaces:**
- Produces: `QueryProvider` component wrapping `@tanstack/react-query`'s `QueryClientProvider` with a `QueryClient` instance created once per component mount (via `useState` lazy initializer, to avoid sharing state across requests in SSR).
- Consumes: nothing new.

- [ ] **Step 1: Install TanStack Query**

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

- [ ] **Step 2: Write the failing test**

```tsx
// lib/providers/query-provider.test.tsx
import { render, screen } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "./query-provider";

function Probe() {
  const { data } = useQuery({
    queryKey: ["probe"],
    queryFn: async () => "ok",
  });
  return <div>{data ?? "loading"}</div>;
}

describe("QueryProvider", () => {
  it("provides a QueryClient to descendants", async () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    expect(await screen.findByText("ok")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run lib/providers/query-provider.test.tsx`
Expected: FAIL with `Cannot find module './query-provider'`

- [ ] **Step 4: Write lib/providers/query-provider.tsx**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run lib/providers/query-provider.test.tsx`
Expected: PASS

- [ ] **Step 6: Wire QueryProvider into app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bookworm Hole",
  description: "Track what you read.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Run full test suite**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add TanStack Query provider"
```

---

## Task 10: App Shell (Header/Nav) with Responsive Layout

**Files:**
- Create: `components/layout/header.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `app/(auth)/layout.tsx`
- Test: `components/layout/header.test.tsx`

**Interfaces:**
- Produces: `Header` component rendering the app logo/name, primary nav links (`Books`, `Collections`, `Reading`, `Friends`, `Chat` — placeholders pointing at `#` until their Blocks exist), a `ThemeToggle`, and an auth-state-aware slot (placeholder "Log in" button — full session wiring is Block 1). `AppLayout` (from `app/(app)/layout.tsx`) renders `<Header />` followed by `{children}` in a responsive container (`max-w-6xl mx-auto px-4`). `AuthLayout` (from `app/(auth)/layout.tsx`) renders a centered minimal container with no nav, for login/register pages in Block 1.
- Consumes: `ThemeToggle` (Task 8), `Button` (Task 5).

- [ ] **Step 1: Write the failing test for Header**

```tsx
// components/layout/header.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { Header } from "./header";

describe("Header", () => {
  it("renders the app name and primary nav links", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByRole("link", { name: /bookworm hole/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^books$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^collections$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^reading$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^friends$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^chat$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/layout/header.test.tsx`
Expected: FAIL with `Cannot find module './header'`

- [ ] **Step 3: Write components/layout/header.tsx**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

const NAV_LINKS = [
  { href: "/books", label: "Books" },
  { href: "/collections", label: "Collections" },
  { href: "/reading", label: "Reading" },
  { href: "/friends", label: "Friends" },
  { href: "/chat", label: "Chat" },
] as const;

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          Bookworm Hole
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/layout/header.test.tsx`
Expected: PASS

- [ ] **Step 5: Write app/(app)/layout.tsx**

```tsx
import { Header } from "@/components/layout/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Write app/(auth)/layout.tsx**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 7: Add a Header story**

```tsx
// components/layout/header.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./header";

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {};
```

- [ ] **Step 8: Run full test suite, lint, and build**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: all tests PASS, no lint errors, `pnpm build` completes with `✓ Compiled successfully` (the `(app)` and `(auth)` route groups have no pages yet, which is fine — Next.js only requires a `page.tsx` for a route to be reachable, not for the build to succeed with just a `layout.tsx`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add app shell header and route-group layouts"
```

---

## Task 11: Empty lib/api, lib/auth, hooks Directories with Placeholder READMEs

**Files:**
- Create: `lib/api/README.md`
- Create: `lib/auth/README.md`
- Create: `hooks/README.md`

**Interfaces:**
- Produces: nothing consumed by code — these are directory placeholders so Block 1 has an established location to add files into, and so `git` tracks otherwise-empty directories.

- [ ] **Step 1: Write lib/api/README.md**

```markdown
# lib/api

Per-domain typed API client modules (axios), one file per API router
(`books.ts`, `collections.ts`, ...). Populated starting Block 1.
```

- [ ] **Step 2: Write lib/auth/README.md**

```markdown
# lib/auth

Session helpers and Next.js middleware for cookie-based auth (BFF pattern —
see `docs/specs/2026-07-13-ui-repo-design.md`). Populated in Block 1.
```

- [ ] **Step 3: Write hooks/README.md**

```markdown
# hooks

TanStack Query hooks per domain (`useBooks`, `useCollections`, ...).
Populated starting Block 1.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold lib/api, lib/auth, hooks directories"
```

---

## Task 12: Environment Variable Template

**Files:**
- Create: `.env.example`
- Modify: `.gitignore` (confirm `.env*.local` and `.env` are ignored — `create-next-app` already ignores these by default; verify)

**Interfaces:**
- Produces: documented env vars `NEXT_PUBLIC_API_BASE_URL`, `API_BASE_URL` (server-side BFF calls), `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECRET` — consumed by Block 1's `lib/api/` axios client and `lib/auth/` middleware.

- [ ] **Step 1: Write .env.example**

```bash
# Copy this file to .env.local and fill in your values.
# cp .env.example .env.local

# === API ===
# Public: used by client components that call the BFF route, not the API directly.
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Server-only: base URL the BFF route handlers / middleware use to call bookworm-hole-api.
API_BASE_URL=http://localhost:8000/api/v1

# === Session (BFF cookie auth, wired in Block 1) ===
SESSION_COOKIE_NAME=bh_session
SESSION_COOKIE_SECRET=change-me-to-a-random-secret
```

- [ ] **Step 2: Verify .gitignore covers env files**

Open `.gitignore`, confirm it contains:

```text
.env*.local
```

`create-next-app` includes this by default. `.env.example` itself must NOT be ignored (it has no real secrets — only placeholder values).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add .env.example for API base URL and session config"
```

---

## Task 13: GitHub Actions CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a CI workflow triggered on `push` and `pull_request` to any branch, running four jobs in sequence-equivalent order (lint, type-check, test, build) using pnpm with cached dependencies.

- [ ] **Step 1: Add a type-check script to package.json**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Verify typecheck passes locally**

Run: `pnpm typecheck`
Expected: no output, exit code 0.

- [ ] **Step 3: Write .github/workflows/ci.yml**

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

`build` depends on the other three jobs via `needs` so a broken build doesn't run after a known lint/type/test failure, keeping the pipeline fast to fail.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions pipeline (lint, typecheck, test, build)"
```

- [ ] **Step 5: Push and verify the workflow runs**

```bash
git push -u origin main
```

Then check the Actions tab on GitHub (or `gh run watch` if the `gh` CLI is authenticated) to confirm all four jobs pass. This step requires the repo to have a `main`/remote already configured — if it doesn't yet, coordinate with the user before pushing (pushing is a shared-state action per this session's operating rules).

---

## Task 14: README

**Files:**
- Create/Modify: `README.md`

**Interfaces:**
- Produces: nothing consumed by code — developer-facing setup doc.

- [ ] **Step 1: Write README.md**

```markdown
# Bookworm Hole UI

Frontend for [`bookworm-hole-api`](../bookworm-hole-api), deployed on Vercel.
Built with Next.js (App Router), Tailwind CSS, shadcn/ui, and TanStack Query.

See [`docs/specs/2026-07-13-ui-repo-design.md`](docs/specs/2026-07-13-ui-repo-design.md)
for the full architecture and delivery-block plan.

## Setup

\`\`\`bash
pnpm install
cp .env.example .env.local  # fill in values
pnpm dev
\`\`\`

App runs at http://localhost:3000. Requires `bookworm-hole-api` running at
http://localhost:8000 (see that repo's README).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier write / check |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Vitest (RTL) |
| `pnpm storybook` | Storybook dev server on :6006 |
| `pnpm build-storybook` | Static Storybook build |

## Project Structure

See the `Repo Structure` section of the design spec linked above.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: add README with setup instructions"
```

---

## Self-Review Notes

- **Spec coverage:** Stack table → Tasks 1–2, 5, 9, 13. Repo Structure → File Structure section + Task 11. Design System deliverable (tokens, base kit, stories, app shell) → Tasks 3, 5, 6, 7, 10. Testing Strategy (Vitest/RTL setup) → Task 4; Playwright is explicitly **not** in this Block (spec ties it to "once wired" per-Block happy paths starting Block 1) — confirmed not a Block 0 gap. CI → Task 13. `.env` handling implied by Data Flow & Error Handling's "baseURL from env" → Task 12.
- **Placeholder scan:** all code steps show full file contents; no "TBD"/"handle errors appropriately" left in place. Task 13 Step 5's push is intentionally left as a coordination point, not a placeholder — it's a real, specific action gated on remote existing.
- **Type consistency:** `cn()` signature (Task 5) matches shadcn's standard; `ThemeProvider`/`QueryProvider`/`Header`/`ThemeToggle` names and prop shapes are consistent between their defining task and their consuming task (Task 10 imports `ThemeToggle` from Task 8, `Button` from Task 5 — both exact export names).
