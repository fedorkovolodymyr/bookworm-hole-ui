# Block 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CI, design tokens, a base shadcn/ui component kit with Storybook coverage, and a static app shell to the existing Next.js scaffold — the foundation every later Block builds on.

**Architecture:** Next.js 16 App Router (already scaffolded) with Tailwind v4 CSS-variable-backed design tokens (light/dark via `prefers-color-scheme` + manual `.dark` override class), shadcn/ui primitives copied into `components/ui/`, Storybook for isolated component review, Vitest + React Testing Library for unit/component tests, Playwright installed and scaffolded (no tests yet), ESLint + Prettier + TypeScript strict, GitHub Actions CI running lint → typecheck → test → build on every PR to `main`.

**Tech Stack:** Next.js 16 (App Router, TypeScript, already installed), React 19, Tailwind CSS v4 (already installed), shadcn/ui (Radix primitives), Storybook 8, Vitest + @testing-library/react + jsdom, Playwright, ESLint (flat config, already installed) + Prettier, pnpm.

## Global Constraints

- Package manager: pnpm only — no npm/yarn lockfiles (per parent spec's Stack table).
- TypeScript strict mode required — already set in `tsconfig.json`.
- CI runs lint, typecheck, test, build on every PR to `main` (per design spec).
- Every `components/ui/*` and `components/shell/*` component ships a Storybook story covering its variants/states (default, disabled, loading, error where applicable).
- Design tokens (color, typography, spacing, radii, shadows) live in `app/globals.css` via Tailwind v4's `@theme` directive, backed by CSS variables for light/dark mode.
- Nav/auth state in the app shell is a static placeholder (logo, static nav links, static "Sign in" button) — no real session wiring; Block 1 replaces this.
- Do NOT create `lib/api/`, `hooks/`, or `app/(auth)/` — those start in Block 1.
- Branch: `block-0-foundation-v2` (already created off current `main`). PR via `gh pr create`, merge through GitHub — never push directly to `main`.

---

## File Structure

```text
bookworm-hole-ui/
  app/
    globals.css                    # MODIFY: add full design token set
  components/
    ui/                            # shadcn/ui primitives (CLI-generated + tests + stories)
      button.tsx / button.stories.tsx / button.test.tsx
      input.tsx / input.stories.tsx / input.test.tsx
      textarea.tsx / textarea.stories.tsx / textarea.test.tsx
      select.tsx / select.stories.tsx / select.test.tsx
      checkbox.tsx / checkbox.stories.tsx / checkbox.test.tsx
      card.tsx / card.stories.tsx / card.test.tsx
      dialog.tsx / dialog.stories.tsx / dialog.test.tsx
      dropdown-menu.tsx / dropdown-menu.stories.tsx / dropdown-menu.test.tsx
      avatar.tsx / avatar.stories.tsx / avatar.test.tsx
      badge.tsx / badge.stories.tsx / badge.test.tsx
      sonner.tsx (toast) / sonner.stories.tsx / sonner.test.tsx
      tabs.tsx / tabs.stories.tsx / tabs.test.tsx
      skeleton.tsx / skeleton.stories.tsx / skeleton.test.tsx
      pagination.tsx / pagination.stories.tsx / pagination.test.tsx
    shell/
      theme-toggle.tsx / theme-toggle.stories.tsx / theme-toggle.test.tsx
      header.tsx / header.stories.tsx / header.test.tsx
      app-shell.tsx / app-shell.stories.tsx / app-shell.test.tsx
  lib/
    utils.ts                       # cn() helper (shadcn requirement)
    theme-provider.tsx              # next-themes wrapper for dark/light toggle
  tests/
    setup.ts                       # Vitest + RTL global setup
  e2e/
    .gitkeep                        # empty Playwright scaffold
  .storybook/
    main.ts
    preview.ts
  .github/workflows/
    ci.yml
  components.json                  # shadcn/ui CLI config
  vitest.config.ts
  playwright.config.ts
  .prettierrc.json
  .prettierignore
  package.json                     # MODIFY: add scripts + deps
```

Rationale: shadcn's toast component is deprecated in favor of `sonner` in current shadcn/ui versions — using `sonner.tsx` is the CLI's actual output name for "Toast" today. `lib/theme-provider.tsx` and `components/shell/theme-toggle.tsx` are split from `header.tsx` since theme switching is reusable independent of the header.

---

## Task 1: Prettier + Lint Scripts

**Files:**
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `package.json` (add `format`, `format:check`, `typecheck` scripts)

**Interfaces:**
- Produces: `pnpm format`, `pnpm format:check`, `pnpm typecheck` commands usable by every later task and by CI (Task 9).

- [ ] **Step 1: Install Prettier and Tailwind class-sorting plugin**

```bash
pnpm add -D prettier prettier-plugin-tailwindcss eslint-config-prettier
```

- [ ] **Step 2: Write .prettierrc.json**

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

- [ ] **Step 4: Add eslint-config-prettier to eslint.config.mjs**

Modify `eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
```

- [ ] **Step 5: Add scripts to package.json**

Add to the `"scripts"` object:

```json
{
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

- [ ] **Step 6: Run lint, typecheck, format:check**

Run: `pnpm lint`
Expected: `✔ No ESLint warnings or errors`

Run: `pnpm typecheck`
Expected: exits 0, no output

Run: `pnpm format` then `pnpm format:check`
Expected: `All matched files use Prettier code style!`

- [ ] **Step 7: Commit**

```bash
git add .prettierrc.json .prettierignore eslint.config.mjs package.json pnpm-lock.yaml
git commit -m "chore: add Prettier and typecheck script"
```

---

## Task 2: Vitest + React Testing Library Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Produces: `pnpm test` (runs Vitest once), jsdom environment, `@testing-library/jest-dom` matchers available globally in every `*.test.tsx` written in later tasks.

- [ ] **Step 1: Install Vitest, RTL, jsdom, jest-dom**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Write vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
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

- [ ] **Step 4: Add test script to package.json**

```json
{
  "test": "vitest run"
}
```

- [ ] **Step 5: Write a smoke test to verify the pipeline works**

Create `tests/smoke.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

function Hello() {
  return <div>hello</div>;
}

describe("vitest + RTL smoke test", () => {
  it("renders", () => {
    render(<Hello />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test`
Expected: `1 passed`

- [ ] **Step 7: Delete the smoke test**

```bash
rm tests/smoke.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json pnpm-lock.yaml
git commit -m "chore: add Vitest and React Testing Library"
```

---

## Task 3: Playwright Scaffold (No Tests Yet)

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/.gitkeep`
- Modify: `.gitignore` (add Playwright artifacts)

**Interfaces:**
- Produces: `pnpm exec playwright test` runnable (0 tests found is expected/correct outcome this block). Block 1 adds the first real spec into `e2e/`.

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: Write playwright.config.ts**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: Create empty e2e directory placeholder**

```bash
mkdir -p e2e
touch e2e/.gitkeep
```

- [ ] **Step 4: Add Playwright artifacts to .gitignore**

Append to `.gitignore`:

```text
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

- [ ] **Step 5: Verify Playwright CLI runs with zero tests**

Run: `pnpm exec playwright test`
Expected: `No tests found` (this is the correct outcome — confirms config loads without error)

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/.gitkeep .gitignore package.json pnpm-lock.yaml
git commit -m "chore: scaffold Playwright (no tests yet)"
```

---

## Task 4: Design Tokens in app/globals.css

**Files:**
- Modify: `app/globals.css`
- Test: `tests/design-tokens.test.ts`

**Interfaces:**
- Produces: CSS variables `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, `--border`, `--input`, `--ring`, `--radius` in `:root` (light) and `.dark` (manual dark override class); Tailwind v4 `@theme inline` mappings `--color-background`, `--color-foreground`, `--color-primary`, `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-accent`, `--color-accent-foreground`, `--color-destructive`, `--color-destructive-foreground`, `--color-success`, `--color-success-foreground`, `--color-warning`, `--color-warning-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--radius-sm`, `--radius-md`, `--radius-lg`.
- Consumes: nothing (first design-system task).

- [ ] **Step 1: Write the failing test asserting token CSS variables exist**

Create `tests/design-tokens.test.ts`:

```ts
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
    const rootBlockMatch = css.match(/:root\s*{([^}]*)}/s);
    expect(rootBlockMatch).not.toBeNull();
    const rootBlock = rootBlockMatch![1];
    for (const token of REQUIRED_TOKENS) {
      expect(rootBlock).toContain(token);
    }
  });

  it("defines every color token override in .dark", () => {
    const darkBlockMatch = css.match(/\.dark\s*{([^}]*)}/s);
    expect(darkBlockMatch).not.toBeNull();
    const darkBlock = darkBlockMatch![1];
    for (const token of REQUIRED_TOKENS.filter((t) => t !== "--radius")) {
      expect(darkBlock).toContain(token);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/design-tokens.test.ts`
Expected: FAIL — current `app/globals.css` has no `.dark` block and only defines `--background`/`--foreground`.

- [ ] **Step 3: Write app/globals.css with full token definitions**

Replace the full contents of `app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;

  --primary: #4f46e5;
  --primary-foreground: #ffffff;

  --secondary: #f4f4f5;
  --secondary-foreground: #18181b;

  --muted: #f4f4f5;
  --muted-foreground: #71717a;

  --accent: #f4f4f5;
  --accent-foreground: #18181b;

  --destructive: #dc2626;
  --destructive-foreground: #ffffff;

  --success: #16a34a;
  --success-foreground: #ffffff;

  --warning: #d97706;
  --warning-foreground: #ffffff;

  --border: #e4e4e7;
  --input: #e4e4e7;
  --ring: #4f46e5;

  --radius: 0.5rem;

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;

  --primary: #818cf8;
  --primary-foreground: #0a0a0a;

  --secondary: #27272a;
  --secondary-foreground: #f4f4f5;

  --muted: #27272a;
  --muted-foreground: #a1a1aa;

  --accent: #27272a;
  --accent-foreground: #f4f4f5;

  --destructive: #f87171;
  --destructive-foreground: #0a0a0a;

  --success: #4ade80;
  --success-foreground: #0a0a0a;

  --warning: #fbbf24;
  --warning-foreground: #0a0a0a;

  --border: #27272a;
  --input: #27272a;
  --ring: #818cf8;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --background: #0a0a0a;
    --foreground: #ededed;

    --primary: #818cf8;
    --primary-foreground: #0a0a0a;

    --secondary: #27272a;
    --secondary-foreground: #f4f4f5;

    --muted: #27272a;
    --muted-foreground: #a1a1aa;

    --accent: #27272a;
    --accent-foreground: #f4f4f5;

    --destructive: #f87171;
    --destructive-foreground: #0a0a0a;

    --success: #4ade80;
    --success-foreground: #0a0a0a;

    --warning: #fbbf24;
    --warning-foreground: #0a0a0a;

    --border: #27272a;
    --input: #27272a;
    --ring: #818cf8;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/design-tokens.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Verify dev server still renders correctly**

Run: `pnpm dev`, visit `http://localhost:3000`
Expected: page renders with no console errors, background/foreground colors visible. Stop server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add app/globals.css tests/design-tokens.test.ts
git commit -m "feat: add design tokens (color, radius) with light/dark support"
```

---

## Task 5: shadcn/ui CLI Init + lib/utils.ts

**Files:**
- Create: `components.json`
- Create: `lib/utils.ts`

**Interfaces:**
- Produces: `cn(...)` utility exported from `lib/utils.ts`, used by every component in Tasks 6–7.
- Consumes: design tokens from Task 4 (shadcn CLI reads `app/globals.css` and `components.json` to know where to place generated files).

- [ ] **Step 1: Install shadcn CLI dependencies**

```bash
pnpm add clsx tailwind-merge class-variance-authority lucide-react
pnpm add -D tw-animate-css
```

- [ ] **Step 2: Run shadcn init**

```bash
pnpm dlx shadcn@latest init
```

When prompted: base color = `neutral`, CSS variables = `yes`, path aliases already resolve via `@/*` in `tsconfig.json`.

- [ ] **Step 3: Verify components.json was created**

Run: `cat components.json`
Expected: JSON with `"tsx": true`, `"tailwind": {...}`, `"aliases": {"components": "@/components", "utils": "@/lib/utils", ...}`.

- [ ] **Step 4: Verify lib/utils.ts was created with cn()**

Run: `cat lib/utils.ts`
Expected:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

If the CLI didn't produce exactly this, overwrite `lib/utils.ts` with the above.

- [ ] **Step 5: Verify app/globals.css tokens were not overwritten incorrectly**

Run: `pnpm test tests/design-tokens.test.ts`
Expected: `2 passed` (shadcn init should not touch our custom tokens beyond adding `@import "tw-animate-css"` — reconcile manually if it stripped anything from Task 4).

- [ ] **Step 6: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add components.json lib/utils.ts app/globals.css package.json pnpm-lock.yaml
git commit -m "chore: init shadcn/ui CLI"
```

---

## Task 6: Generate shadcn/ui Components (Batch 1 — Button, Input, Textarea, Select, Checkbox, Card)

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/checkbox.tsx`, `components/ui/card.tsx`
- Create: matching `.stories.tsx` and `.test.tsx` for each

**Interfaces:**
- Consumes: `cn()` from `lib/utils.ts` (Task 5).
- Produces: `Button` (props: `variant: "default"|"destructive"|"outline"|"secondary"|"ghost"|"link"`, `size: "default"|"sm"|"lg"|"icon"`, `disabled?: boolean`), `Input`, `Textarea`, `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`, `Checkbox`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` — all exported for use by later components and Block 1+ pages.

- [ ] **Step 1: Generate components via shadcn CLI**

```bash
pnpm dlx shadcn@latest add button input textarea select checkbox card
```

- [ ] **Step 2: Verify each file was created**

Run: `ls components/ui/`
Expected: `button.tsx input.tsx textarea.tsx select.tsx checkbox.tsx card.tsx` present.

- [ ] **Step 3: Write Button story**

Create `components/ui/button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: "Button" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Delete" } };
export const Outline: Story = { args: { variant: "outline", children: "Outline" } };
export const Secondary: Story = { args: { variant: "secondary", children: "Secondary" } };
export const Ghost: Story = { args: { variant: "ghost", children: "Ghost" } };
export const Link: Story = { args: { variant: "link", children: "Link" } };
export const Disabled: Story = { args: { disabled: true, children: "Disabled" } };
export const Small: Story = { args: { size: "sm", children: "Small" } };
export const Large: Story = { args: { size: "lg", children: "Large" } };
```

- [ ] **Step 4: Write Button test**

Create `components/ui/button.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Write Input story and test**

Create `components/ui/input.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: "Enter text..." } };
export const Disabled: Story = { args: { placeholder: "Disabled", disabled: true } };
export const WithValue: Story = { args: { defaultValue: "Hello" } };
export const Email: Story = { args: { type: "email", placeholder: "you@example.com" } };
```

Create `components/ui/input.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    render(<Input placeholder="type here" />);
    const input = screen.getByPlaceholderText("type here");
    await userEvent.type(input, "hello");
    expect(input).toHaveValue("hello");
  });

  it("is disabled when disabled prop set", () => {
    render(<Input placeholder="disabled" disabled />);
    expect(screen.getByPlaceholderText("disabled")).toBeDisabled();
  });
});
```

- [ ] **Step 6: Write Textarea story and test**

Create `components/ui/textarea.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = { args: { placeholder: "Type your message..." } };
export const Disabled: Story = { args: { placeholder: "Disabled", disabled: true } };
```

Create `components/ui/textarea.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Type your message..." />);
    expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    render(<Textarea placeholder="type here" />);
    const textarea = screen.getByPlaceholderText("type here");
    await userEvent.type(textarea, "hello world");
    expect(textarea).toHaveValue("hello world");
  });
});
```

- [ ] **Step 7: Write Select story and test**

Create `components/ui/select.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a book status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="reading">Reading</SelectItem>
        <SelectItem value="finished">Finished</SelectItem>
        <SelectItem value="want-to-read">Want to Read</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Disabled" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">A</SelectItem>
      </SelectContent>
    </Select>
  ),
};
```

Create `components/ui/select.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

describe("Select", () => {
  it("renders trigger with placeholder", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("opens content and selects an item", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByRole("combobox"));
    const option = await screen.findByText("Option A");
    await userEvent.click(option);
    expect(screen.getByRole("combobox")).toHaveTextContent("Option A");
  });
});
```

- [ ] **Step 8: Write Checkbox story and test**

Create `components/ui/checkbox.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
```

Create `components/ui/checkbox.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("toggles when clicked", async () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("is disabled when disabled prop set", () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
```

- [ ] **Step 9: Write Card story and test**

Create `components/ui/card.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Book Title</CardTitle>
        <CardDescription>by Author Name</CardDescription>
      </CardHeader>
      <CardContent>
        <p>A short synopsis of the book goes here.</p>
      </CardContent>
      <CardFooter>
        <Button>View Details</Button>
      </CardFooter>
    </Card>
  ),
};
```

Create `components/ui/card.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardTitle } from "./card";

describe("Card", () => {
  it("renders title and content", () => {
    render(
      <Card>
        <CardTitle>My Title</CardTitle>
        <CardContent>My content</CardContent>
      </Card>,
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("My content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run all tests for this batch**

Run: `pnpm test components/ui/button.test.tsx components/ui/input.test.tsx components/ui/textarea.test.tsx components/ui/select.test.tsx components/ui/checkbox.test.tsx components/ui/card.test.tsx`
Expected: all pass.

- [ ] **Step 11: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: both exit 0.

- [ ] **Step 12: Commit**

```bash
git add components/ui/button.tsx components/ui/button.stories.tsx components/ui/button.test.tsx \
  components/ui/input.tsx components/ui/input.stories.tsx components/ui/input.test.tsx \
  components/ui/textarea.tsx components/ui/textarea.stories.tsx components/ui/textarea.test.tsx \
  components/ui/select.tsx components/ui/select.stories.tsx components/ui/select.test.tsx \
  components/ui/checkbox.tsx components/ui/checkbox.stories.tsx components/ui/checkbox.test.tsx \
  components/ui/card.tsx components/ui/card.stories.tsx components/ui/card.test.tsx \
  package.json pnpm-lock.yaml
git commit -m "feat: add Button, Input, Textarea, Select, Checkbox, Card components"
```

---

## Task 7: Generate shadcn/ui Components (Batch 2 — Dialog, Dropdown Menu, Avatar, Badge, Sonner/Toast, Tabs, Skeleton, Pagination)

**Files:**
- Create: `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/avatar.tsx`, `components/ui/badge.tsx`, `components/ui/sonner.tsx`, `components/ui/tabs.tsx`, `components/ui/skeleton.tsx`, `components/ui/pagination.tsx`
- Create: matching `.stories.tsx` and `.test.tsx` for each

**Interfaces:**
- Consumes: `cn()` from `lib/utils.ts` (Task 5), `Button` from Task 6 (Pagination story uses it).
- Produces: `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`, `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem`, `Avatar`/`AvatarImage`/`AvatarFallback`, `Badge` (props: `variant: "default"|"secondary"|"destructive"|"outline"`), `Toaster` + `toast()` from `sonner`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Skeleton`, `Pagination`/`PaginationContent`/`PaginationItem`/`PaginationLink`/`PaginationPrevious`/`PaginationNext` — for use by Block 1+ pages.

- [ ] **Step 1: Generate components via shadcn CLI**

```bash
pnpm dlx shadcn@latest add dialog dropdown-menu avatar badge sonner tabs skeleton pagination
```

- [ ] **Step 2: Verify each file was created**

Run: `ls components/ui/`
Expected: `dialog.tsx dropdown-menu.tsx avatar.tsx badge.tsx sonner.tsx tabs.tsx skeleton.tsx pagination.tsx` present alongside Task 6's files.

- [ ] **Step 3: Write Dialog story and test**

Create `components/ui/dialog.stories.tsx`:

```tsx
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
  component: Dialog,
};
export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete review?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};
```

Create `components/ui/dialog.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";

describe("Dialog", () => {
  it("does not show content until triggered", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Hidden Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText("Hidden Title")).not.toBeInTheDocument();
  });

  it("shows content after trigger is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Visible Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Visible Title")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Write Dropdown Menu story and test**

Create `components/ui/dropdown-menu.stories.tsx`:

```tsx
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
  component: DropdownMenu,
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
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
```

Create `components/ui/dropdown-menu.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

describe("DropdownMenu", () => {
  it("shows items after trigger is clicked", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Edit")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Write Avatar story and test**

Create `components/ui/avatar.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="user avatar" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="" alt="broken" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};
```

Create `components/ui/avatar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar, AvatarFallback } from "./avatar";

describe("Avatar", () => {
  it("renders fallback text", () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Write Badge story and test**

Create `components/ui/badge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: "Default" } };
export const Secondary: Story = { args: { variant: "secondary", children: "Secondary" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Destructive" } };
export const Outline: Story = { args: { variant: "outline", children: "Outline" } };
```

Create `components/ui/badge.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Write Sonner (Toast) story and test**

Create `components/ui/sonner.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";
import { Toaster } from "./sonner";
import { Button } from "./button";

const meta: Meta<typeof Toaster> = {
  title: "UI/Toast",
  component: Toaster,
};
export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast("Book added to collection")}>Show Toast</Button>
    </div>
  ),
};

export const ErrorToast: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast.error("Failed to save review")}>Show Error Toast</Button>
    </div>
  ),
};
```

Create `components/ui/sonner.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Toaster } from "./sonner";

describe("Toaster", () => {
  it("renders without crashing", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeTruthy();
  });
});
```

- [ ] **Step 8: Write Tabs story and test**

Create `components/ui/tabs.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
};
export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="reading" className="w-80">
      <TabsList>
        <TabsTrigger value="reading">Reading</TabsTrigger>
        <TabsTrigger value="finished">Finished</TabsTrigger>
      </TabsList>
      <TabsContent value="reading">Books currently being read.</TabsContent>
      <TabsContent value="finished">Books finished.</TabsContent>
    </Tabs>
  ),
};
```

Create `components/ui/tabs.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs", () => {
  it("shows the default tab content", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("Content A")).toBeInTheDocument();
  });

  it("switches content when a different tab is clicked", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );
    await userEvent.click(screen.getByText("B"));
    expect(await screen.findByText("Content B")).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Write Skeleton story and test**

Create `components/ui/skeleton.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
};

export const Card: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-32 w-48" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-24" />
    </div>
  ),
};
```

Create `components/ui/skeleton.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a div element", () => {
    const { container } = render(<Skeleton data-testid="skeleton" />);
    expect(container.querySelector('[data-testid="skeleton"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Write Pagination story and test**

Create `components/ui/pagination.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

const meta: Meta<typeof Pagination> = {
  title: "UI/Pagination",
  component: Pagination,
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
          <PaginationLink href="#" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
```

Create `components/ui/pagination.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "./pagination";

describe("Pagination", () => {
  it("renders page links", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 11: Run all tests for this batch**

Run: `pnpm test components/ui/dialog.test.tsx components/ui/dropdown-menu.test.tsx components/ui/avatar.test.tsx components/ui/badge.test.tsx components/ui/sonner.test.tsx components/ui/tabs.test.tsx components/ui/skeleton.test.tsx components/ui/pagination.test.tsx`
Expected: all pass.

- [ ] **Step 12: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: both exit 0.

- [ ] **Step 13: Commit**

```bash
git add components/ui/dialog.tsx components/ui/dialog.stories.tsx components/ui/dialog.test.tsx \
  components/ui/dropdown-menu.tsx components/ui/dropdown-menu.stories.tsx components/ui/dropdown-menu.test.tsx \
  components/ui/avatar.tsx components/ui/avatar.stories.tsx components/ui/avatar.test.tsx \
  components/ui/badge.tsx components/ui/badge.stories.tsx components/ui/badge.test.tsx \
  components/ui/sonner.tsx components/ui/sonner.stories.tsx components/ui/sonner.test.tsx \
  components/ui/tabs.tsx components/ui/tabs.stories.tsx components/ui/tabs.test.tsx \
  components/ui/skeleton.tsx components/ui/skeleton.stories.tsx components/ui/skeleton.test.tsx \
  components/ui/pagination.tsx components/ui/pagination.stories.tsx components/ui/pagination.test.tsx \
  package.json pnpm-lock.yaml
git commit -m "feat: add Dialog, DropdownMenu, Avatar, Badge, Toast, Tabs, Skeleton, Pagination components"
```

---

## Task 8: App Shell — ThemeProvider, ThemeToggle, Header, AppShell

**Files:**
- Create: `lib/theme-provider.tsx`
- Create: `components/shell/theme-toggle.tsx`, `components/shell/theme-toggle.stories.tsx`, `components/shell/theme-toggle.test.tsx`
- Create: `components/shell/header.tsx`, `components/shell/header.stories.tsx`, `components/shell/header.test.tsx`
- Create: `components/shell/app-shell.tsx`, `components/shell/app-shell.stories.tsx`, `components/shell/app-shell.test.tsx`
- Modify: `app/layout.tsx` (wrap children in `ThemeProvider`)

**Interfaces:**
- Consumes: `Button` (Task 6), `Avatar`/`AvatarFallback` (Task 7), `cn()` (Task 5), design tokens `.dark` class (Task 4).
- Produces: `ThemeProvider` (wraps app, manages `.dark` class on `<html>`), `ThemeToggle` (button component, no props, toggles theme), `Header` (props: none — static placeholder nav + "Sign in" button + `ThemeToggle`), `AppShell` (props: `children: React.ReactNode` — renders `Header` + responsive content wrapper). `app/layout.tsx`'s `RootLayout` wraps `{children}` in `<ThemeProvider>`.

- [ ] **Step 1: Install next-themes**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Write lib/theme-provider.tsx**

```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 3: Modify app/layout.tsx to wrap children in ThemeProvider**

Read the current `app/layout.tsx` first, then add the import and wrap the `<body>` children:

```tsx
import { ThemeProvider } from "@/lib/theme-provider";

// inside RootLayout's returned JSX, wrap the existing {children}:
<ThemeProvider>{children}</ThemeProvider>;
```

Also add `suppressHydrationWarning` to the `<html>` tag (required by `next-themes` to avoid hydration mismatch warnings).

- [ ] **Step 4: Write components/shell/theme-toggle.tsx**

```tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

- [ ] **Step 5: Write ThemeToggle story**

Create `components/shell/theme-toggle.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ThemeToggle } from "./theme-toggle";
import { ThemeProvider } from "@/lib/theme-provider";

const meta: Meta<typeof ThemeToggle> = {
  title: "Shell/ThemeToggle",
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};
```

- [ ] **Step 6: Write ThemeToggle test**

Create `components/shell/theme-toggle.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";
import { ThemeProvider } from "@/lib/theme-provider";

describe("ThemeToggle", () => {
  it("renders a toggle button after mount", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Toggle theme" })).toBeEnabled();
    });
  });
});
```

- [ ] **Step 7: Write components/shell/header.tsx**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export function Header() {
  return (
    <header className="border-border flex h-16 items-center justify-between border-b px-4 sm:px-6">
      <Link href="/" className="text-lg font-semibold">
        Bookworm Hole
      </Link>
      <nav className="hidden items-center gap-6 sm:flex">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          Browse
        </Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          Collections
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button size="sm">Sign in</Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 8: Write Header story**

Create `components/shell/header.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./header";
import { ThemeProvider } from "@/lib/theme-provider";

const meta: Meta<typeof Header> = {
  title: "Shell/Header",
  component: Header,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {};
```

- [ ] **Step 9: Write Header test**

Create `components/shell/header.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";
import { ThemeProvider } from "@/lib/theme-provider";

describe("Header", () => {
  it("renders the logo link", () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
  });

  it("renders a static Sign in button", () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Write components/shell/app-shell.tsx**

```tsx
import * as React from "react";
import { Header } from "@/components/shell/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 11: Write AppShell story**

Create `components/shell/app-shell.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/lib/theme-provider";

const meta: Meta<typeof AppShell> = {
  title: "Shell/AppShell",
  component: AppShell,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
  args: {
    children: <p>Page content goes here.</p>,
  },
};
```

- [ ] **Step 12: Write AppShell test**

Create `components/shell/app-shell.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/lib/theme-provider";

describe("AppShell", () => {
  it("renders header and children", () => {
    render(
      <ThemeProvider>
        <AppShell>
          <p>Test content</p>
        </AppShell>
      </ThemeProvider>,
    );
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 13: Run all shell tests**

Run: `pnpm test components/shell/`
Expected: all pass.

- [ ] **Step 14: Verify dev server renders shell correctly**

Run: `pnpm dev`, visit `http://localhost:3000`
Expected: no visible shell yet (app/page.tsx doesn't use AppShell — that's optional this block since no real pages exist). Instead verify via Storybook in Task 9. Stop server (Ctrl+C).

- [ ] **Step 15: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: both exit 0.

- [ ] **Step 16: Commit**

```bash
git add lib/theme-provider.tsx app/layout.tsx \
  components/shell/theme-toggle.tsx components/shell/theme-toggle.stories.tsx components/shell/theme-toggle.test.tsx \
  components/shell/header.tsx components/shell/header.stories.tsx components/shell/header.test.tsx \
  components/shell/app-shell.tsx components/shell/app-shell.stories.tsx components/shell/app-shell.test.tsx \
  package.json pnpm-lock.yaml
git commit -m "feat: add app shell (ThemeProvider, ThemeToggle, Header, AppShell)"
```

---

## Task 9: Storybook Setup

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.ts`
- Modify: `package.json` (add `storybook`, `build-storybook` scripts)

**Interfaces:**
- Produces: `pnpm storybook` (dev server on port 6006), `pnpm build-storybook` (static build) — renders every `.stories.tsx` created in Tasks 6–8.
- Consumes: `app/globals.css` (Task 4) for token/Tailwind styles inside Storybook's iframe.

- [ ] **Step 1: Install Storybook**

```bash
pnpm dlx storybook@latest init --type nextjs --yes
```

- [ ] **Step 2: Verify .storybook/main.ts references the correct stories glob**

Run: `cat .storybook/main.ts`
Expected: `stories` array includes `"../components/**/*.stories.@(js|jsx|mjs|ts|tsx)"`. If the generated config uses a different path (e.g. `../src/**`), edit it to match this repo's `components/` location at the root.

- [ ] **Step 3: Verify .storybook/preview.ts imports global CSS**

Open `.storybook/preview.ts` (or `.tsx`), confirm it imports `"../app/globals.css"` at the top so Tailwind classes and design tokens apply inside Storybook. Add the import if the generated file is missing it.

- [ ] **Step 4: Add storybook-static to .gitignore**

Append to `.gitignore`:

```text
storybook-static
```

- [ ] **Step 5: Run Storybook build to verify all stories compile**

Run: `pnpm build-storybook`
Expected: exits 0, `storybook-static/` directory created with no errors about missing stories from Tasks 6–8 (Button, Input, Textarea, Select, Checkbox, Card, Dialog, DropdownMenu, Avatar, Badge, Toast, Tabs, Skeleton, Pagination, ThemeToggle, Header, AppShell).

- [ ] **Step 6: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add .storybook/ .gitignore package.json pnpm-lock.yaml
git commit -m "chore: add Storybook"
```

---

## Task 10: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: CI pipeline triggered on every PR to `main`, running `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` in order; PR merge is blocked if any step fails (assuming branch protection is configured in GitHub settings — out of scope to configure here, note it for the user).

- [ ] **Step 1: Write .github/workflows/ci.yml**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Format check
        run: pnpm format:check

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

- [ ] **Step 2: Verify YAML syntax is valid**

Run: `pnpm dlx yaml-lint .github/workflows/ci.yml 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" `
Expected: no errors (if neither tool is available, visually re-check indentation matches the block above exactly).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline (lint, typecheck, format, test, build)"
```

---

## Task 11: Full Local Gate — Run Every Check Before Opening PR

**Files:** none (verification only)

**Interfaces:** none — this task only runs commands and fixes any failures surfaced.

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: `✔ No ESLint warnings or errors`. If it fails, fix the reported files and re-run.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: exits 0 with no output. If it fails, fix the reported type errors and re-run.

- [ ] **Step 3: Run format:check**

Run: `pnpm format:check`
Expected: `All matched files use Prettier code style!`. If it fails, run `pnpm format` then re-run `pnpm format:check`, then commit the formatting fix.

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: all tests across `tests/`, `components/ui/`, `components/shell/` pass, 0 failures.

- [ ] **Step 5: Run production build**

Run: `pnpm build`
Expected: exits 0, `.next/` build output produced with no errors.

- [ ] **Step 6: Run Storybook build**

Run: `pnpm build-storybook`
Expected: exits 0.

- [ ] **Step 7: Run Playwright with zero tests (sanity check config still loads)**

Run: `pnpm exec playwright test`
Expected: `No tests found`.

- [ ] **Step 8: If any step above required a fix, commit it**

```bash
git add -A
git commit -m "fix: address CI gate failures"
```

(Skip this step if every check passed cleanly on the first run.)

---

## Task 12: Open Pull Request

**Files:** none

- [ ] **Step 1: Push branch**

```bash
git push -u origin block-0-foundation-v2
```

- [ ] **Step 2: Open PR via gh**

```bash
gh pr create --title "Block 0: Foundation" --body "$(cat <<'EOF'
## Summary
- CI (lint, typecheck, format, test, build) via GitHub Actions
- Design tokens (color/typography/spacing/radii/shadows) with light/dark support
- 14 shadcn/ui base components, each with Storybook story + Vitest test
- Static app shell (Header, ThemeToggle, AppShell) — nav/auth is a placeholder until Block 1
- Vitest + RTL and Playwright (scaffold only, no tests yet) wired up

## Test plan
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm format:check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm build-storybook`
- [x] `pnpm exec playwright test` (0 tests found — expected)
EOF
)"
```

- [ ] **Step 3: Report PR URL to user**

Output the PR URL returned by `gh pr create` so the user can review and merge through GitHub.

---

## Self-Review Notes

**Spec coverage:** Design tokens → Task 4. Base component kit (14 components) → Tasks 6–7. Storybook → Task 9. App shell (header/nav, auth-aware layout placeholder, responsive) → Task 8. CI (lint/typecheck/test/build) → Task 10. Vitest+RTL → Task 2. Playwright scaffold (per user decision, included this block, no tests) → Task 3. Prettier/format → Task 1. Full gate before PR → Task 11. PR via `gh pr create`, no direct push to `main` → Task 12, matches `CLAUDE.md` git workflow.

**Type consistency:** `cn()` signature fixed in Task 5, used identically in Tasks 6–8 (implicitly, via shadcn-generated files). `ThemeProvider` props (`children`, spread `ThemeProviderProps`) defined in Task 8 Step 2, consumed identically in Storybook decorators across Tasks 8's own stories. `AppShell({ children: React.ReactNode })` signature consistent between Step 10 (impl) and Step 11 (story) and Step 12 (test).

**No placeholders:** All steps contain complete, runnable code — no TBD/TODO markers.
