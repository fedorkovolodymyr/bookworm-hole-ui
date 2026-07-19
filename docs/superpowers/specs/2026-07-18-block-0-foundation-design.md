# Block 0: Foundation — Design

## Purpose

Implement Block 0 per `docs/specs/2026-07-13-ui-repo-design.md`: repo scaffold, CI, design tokens, base component kit, Storybook, app shell. Single PR (`block-0-foundation` branch → PR → merge via GitHub, no direct push to `main`).

## Current State

Raw `create-next-app` scaffold: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, Tailwind v4 (`@tailwindcss/postcss`) and ESLint flat config already installed. pnpm already the package manager (`pnpm-workspace.yaml` present). No shadcn/ui, no tests, no Storybook, no CI.

## Build Order

1. **Tooling** — pnpm scripts (`typecheck`, `test`, `format`, `format:check`), Prettier, Vitest + React Testing Library, Playwright scaffold (no tests yet), GitHub Actions CI.
2. **Design tokens** — Tailwind v4 theme via `@theme` in `globals.css`: color (primary/neutral/success/error/warning), typography scale, spacing scale, radii, shadows. Light + dark variable sets driven by `prefers-color-scheme`, plus a manual override class for the theme toggle.
3. **Base component kit** — `shadcn/ui` CLI init, then generate into `components/ui/`: Button, Input, Textarea, Select, Checkbox, Card, Dialog, Dropdown, Avatar, Badge, Toast, Tabs, Skeleton, Pagination. Each ships a `.stories.tsx` (variants/states: default, disabled, loading, error where applicable) and a Vitest + RTL render/interaction test.
4. **App shell** — `components/shell/`: `Header`, `Nav`, `ThemeToggle` (working light/dark switcher), `AppShell` layout wrapper. Nav/auth state is static placeholder (logo, static nav links, static "Sign in" button) — no real session wiring; Block 1 replaces the placeholder with real auth state. Responsive breakpoints. Storybook-covered.

## CI & Testing

- `.github/workflows/ci.yml`, triggered on PRs to `main`: `pnpm install` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`.
- Vitest: jsdom environment, RTL setup file at `tests/setup.ts`. No coverage threshold enforced yet.
- Playwright: installed and `playwright.config.ts` scaffolded, `e2e/` directory created empty. Not run in CI yet — first real e2e test and CI wiring lands with Block 1's login happy-path, per the parent spec's testing strategy.
- ESLint: extend existing flat config with Storybook and Testing Library recommended rules.

## Structure Added

```text
components/
  ui/          # 14 shadcn/ui components, each with .stories.tsx + .test.tsx
  shell/       # Header, Nav, ThemeToggle, AppShell (+ stories/tests)
tests/
  setup.ts
e2e/           # empty Playwright scaffold
.storybook/
  main.ts
  preview.ts
.github/workflows/
  ci.yml
```

`lib/api/`, `hooks/`, `app/(auth)/` are **not** created this block — they start in Block 1.

## Out of Scope

- Any real authentication or session state.
- Domain components, API client, TanStack Query hooks.
- Playwright tests (scaffold only).
- Vercel project/env configuration (manual, per parent spec).

## Testing Strategy

- Every `components/ui/*` and `components/shell/*` component: Storybook story (variants/states) + Vitest/RTL test.
- No hook or API tests this block (nothing to test yet — first hooks arrive in Block 1).
- CI gate: lint, typecheck, test, build must pass before merge.
