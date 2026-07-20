# Block 2 (Catalog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Catalog block — public book/release/contributor browsing, admin catalog management, version history/diff viewer, and next-intl (en/uk) infra including migration of existing Block 1 strings.

**Architecture:** Standard per-block shape (`lib/api/<domain>.ts` → `hooks/use<Domain>.ts` → `components/<domain>/` → `app/(app)/<domain>/...`), split into public vs admin files per domain for the admin boundary. next-intl wraps the root layout; message files replace all hardcoded UI strings, old and new.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, axios, next-intl, shadcn/ui (Radix via @base-ui/react), Tailwind, Vitest + RTL + msw, Playwright.

## Global Constraints

- Package manager: pnpm. Scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`.
- Never merge/push directly to `main` — this whole block lands via one PR on branch `worktree-block-2-catalog`.
- API base path `/api/v1`; axios client already proxies through `/api` (see `lib/api/client.ts`) — new domain files call relative paths like `apiClient.get("/books")`.
- Error shape is uniform: `{ detail: string }`. Use `extractErrorMessage` from `lib/api/errors.ts` in every form/mutation error display.
- `POST .../contributors` (books and releases) returns **HTTP 200** for both create and already-existed — branch on response body `{status: "created"|"already_existed"}`, never on status code.
- `POST /external/import` response does not compute `average_rating`/`rating_count` (defaults `null`/`0`) — the import success UI must not render this as a real "0 stars", show "Not yet rated" instead when `rating_count === 0 && average_rating === null` in that specific context.
- Admin boundary: routes under `app/(app)/admin/catalog/**`; `proxy.ts` gets `/admin` added to `PROTECTED_PATHS` (presence-only check, existing pattern); `app/(app)/admin/catalog/layout.tsx` does a server-side `fetchProfile()` call and redirects non-admins to `/`. Admin-only API calls live in separate `*-admin.ts` files, never imported from public pages/components.
- All new UI strings (Block 2 and migrated Block 1) go through `useTranslations()` from next-intl — no hardcoded UI copy in JSX.
- Every component gets a Storybook story (default, loading, error, empty states as applicable) and a Vitest/RTL test.
- Every hook gets a Vitest test against a mocked API (msw), covering success + error branches.

---

## Phase 1 — i18n Infrastructure + Block 1 Migration

### Task 1: Install and configure next-intl

**Files:**

- Modify: `package.json` (add `next-intl` dependency)
- Create: `i18n/request.ts`
- Create: `i18n/routing.ts`
- Modify: `next.config.ts` (wrap with next-intl plugin)
- Create: `messages/en.json`
- Create: `messages/uk.json`
- Modify: `app/layout.tsx`

**Interfaces:**

- Produces: `messages/en.json` / `messages/uk.json` structure with top-level namespaces `common`, `auth`, `profile`, `catalog`, `catalogAdmin`, `history` — later tasks add keys under these namespaces.
- Produces: locale cookie name `NEXT_LOCALE` (next-intl default), read via `getLocale()` server-side.

- [ ] **Step 1: Install next-intl**

```bash
pnpm add next-intl
```

- [ ] **Step 2: Create routing config**

```ts
// i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "uk"],
  defaultLocale: "en",
  localePrefix: "never",
});
```

- [ ] **Step 3: Create request config**

```ts
// i18n/request.ts
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale && routing.locales.includes(cookieLocale as (typeof routing.locales)[number])
      ? cookieLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Wrap Next config with next-intl plugin**

Read `next.config.ts` first to see its current export, then wrap it:

```ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// wrap the existing config export:
export default withNextIntl(nextConfig);
```

- [ ] **Step 5: Seed initial message files with a `common` namespace**

```json
// messages/en.json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "create": "Create",
    "confirm": "Confirm",
    "somethingWentWrong": "Something went wrong. Please try again."
  }
}
```

```json
// messages/uk.json
{
  "common": {
    "loading": "Завантаження...",
    "save": "Зберегти",
    "cancel": "Скасувати",
    "edit": "Редагувати",
    "delete": "Видалити",
    "create": "Створити",
    "confirm": "Підтвердити",
    "somethingWentWrong": "Щось пішло не так. Спробуйте ще раз."
  }
}
```

- [ ] **Step 6: Wrap root layout with `NextIntlClientProvider`**

Modify `app/layout.tsx`: import `NextIntlClientProvider`, `getLocale`, `getMessages` from `next-intl/server`/`next-intl`, make `RootLayout` async, fetch `locale`/`messages`, set `<html lang={locale}>`, wrap children:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bookworm Hole",
  description: "Track, review, and discover books.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AppQueryProvider>{children}</AppQueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify build**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed with no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml i18n/ messages/ app/layout.tsx next.config.ts
git commit -m "feat(i18n): add next-intl infra with en/uk message files"
```

(Already on the isolated worktree branch for this block — no need to create a new branch here.)

---

### Task 2: Locale switcher component + wire into header

**Files:**

- Create: `components/shell/locale-switcher.tsx`
- Create: `components/shell/locale-switcher.stories.tsx`
- Create: `components/shell/locale-switcher.test.tsx`
- Modify: `components/shell/header.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `common.language`, `common.english`, `common.ukrainian`)

**Interfaces:**

- Consumes: `routing.locales`, `routing.defaultLocale` from `i18n/routing.ts` (Task 1).
- Produces: `LocaleSwitcher` component, no props, sets `NEXT_LOCALE` cookie and calls `router.refresh()`.

- [ ] **Step 1: Add message keys**

Add to both `messages/en.json` and `messages/uk.json` under `common`:

```json
"language": "Language",
"english": "English",
"ukrainian": "Ukrainian"
```

(uk.json: `"language": "Мова", "english": "Англійська", "ukrainian": "Українська"`)

- [ ] **Step 2: Write component test**

```tsx
// components/shell/locale-switcher.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";
import enMessages from "@/messages/en.json";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  it("renders a trigger button", () => {
    renderSwitcher();
    expect(screen.getByRole("button", { name: /language/i })).toBeInTheDocument();
  });

  it("switches locale and refreshes on selecting Ukrainian", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("button", { name: /language/i }));
    await user.click(screen.getByRole("menuitem", { name: /ukrainian/i }));
    expect(document.cookie).toContain("NEXT_LOCALE=uk");
    expect(refreshMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `pnpm test locale-switcher`
Expected: FAIL — `locale-switcher.tsx` not found.

- [ ] **Step 3: Implement component**

```tsx
// components/shell/locale-switcher.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from "@/i18n/routing";

const LABEL_KEYS: Record<(typeof routing.locales)[number], "english" | "ukrainian"> = {
  en: "english",
  uk: "ukrainian",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();

  function switchLocale(next: string) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("language")}>
            <Languages className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent>
        {routing.locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchLocale(code)}
            disabled={code === locale}
          >
            {t(LABEL_KEYS[code])}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test locale-switcher`
Expected: PASS

- [ ] **Step 5: Write story**

```tsx
// components/shell/locale-switcher.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof LocaleSwitcher> = {
  title: "Shell/LocaleSwitcher",
  component: LocaleSwitcher,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof LocaleSwitcher> = {};
```

- [ ] **Step 6: Wire into header**

Modify `components/shell/header.tsx`: import `LocaleSwitcher`, render it next to `ThemeToggle`:

```tsx
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
// ...
<div className="flex items-center gap-2">
  <LocaleSwitcher />
  <ThemeToggle />
  {/* ...rest unchanged */}
</div>;
```

- [ ] **Step 7: Run full test + lint**

Run: `pnpm test && pnpm lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add components/shell/locale-switcher.tsx components/shell/locale-switcher.stories.tsx components/shell/locale-switcher.test.tsx components/shell/header.tsx components/shell/header.test.tsx messages/
git commit -m "feat(i18n): add locale switcher to app shell header"
```

---

### Task 3: Migrate Block 1 auth strings (login, register, verify pages/forms)

**Files:**

- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/register/page.tsx`
- Modify: `app/(auth)/verify/page.tsx`
- Modify: `components/auth/login-form.tsx`
- Modify: `components/auth/register-form.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `auth` namespace)
- Modify existing test files for the above (update assertions to match new text if tests assert exact strings — check each test file first)

**Interfaces:**

- Consumes: `useTranslations("auth")` from next-intl.
- Produces: `auth.*` message keys used by these five files: `login.title`, `login.email`, `login.password`, `login.submit`, `login.submitting`, `login.noAccount`, `login.createOne`, `register.title`, `register.email`, `register.username`, `register.displayName`, `register.password`, `register.submit`, `register.submitting`, `register.haveAccount`, `register.logIn`, `verify.missingToken`, `verify.verifying`, `verify.invalid`, `verify.success`.

- [ ] **Step 1: Add message keys**

`messages/en.json`, add top-level `auth`:

```json
"auth": {
  "login": {
    "title": "Log in",
    "email": "Email",
    "password": "Password",
    "submit": "Log in",
    "submitting": "Logging in...",
    "noAccount": "Don't have an account?",
    "createOne": "Create one"
  },
  "register": {
    "title": "Create an account",
    "email": "Email",
    "username": "Username",
    "displayName": "Display name",
    "password": "Password",
    "submit": "Create account",
    "submitting": "Creating account...",
    "haveAccount": "Already have an account?",
    "logIn": "Log in"
  },
  "verify": {
    "missingToken": "Missing verification token.",
    "verifying": "Verifying your email...",
    "invalid": "This verification link is invalid or expired.",
    "success": "Your email has been verified."
  }
}
```

`messages/uk.json`, matching structure:

```json
"auth": {
  "login": {
    "title": "Увійти",
    "email": "Електронна пошта",
    "password": "Пароль",
    "submit": "Увійти",
    "submitting": "Вхід...",
    "noAccount": "Немає облікового запису?",
    "createOne": "Створити"
  },
  "register": {
    "title": "Створити обліковий запис",
    "email": "Електронна пошта",
    "username": "Ім'я користувача",
    "displayName": "Відображуване ім'я",
    "password": "Пароль",
    "submit": "Створити обліковий запис",
    "submitting": "Створення облікового запису...",
    "haveAccount": "Вже маєте обліковий запис?",
    "logIn": "Увійти"
  },
  "verify": {
    "missingToken": "Відсутній токен підтвердження.",
    "verifying": "Підтвердження електронної пошти...",
    "invalid": "Це посилання для підтвердження недійсне або застаріле.",
    "success": "Вашу електронну пошту підтверджено."
  }
}
```

- [ ] **Step 2: Update login-form.tsx**

Add `const t = useTranslations("auth.login");` and replace literal labels: `"Email"` → `{t("email")}`, `"Password"` → `{t("password")}`, button text ternary → `{login.isPending ? t("submitting") : t("submit")}`. Keep `extractErrorMessage(login.error)` as-is (server-sourced, not UI copy).

- [ ] **Step 3: Update register-form.tsx**

Same pattern with `useTranslations("auth.register")` for `email`, `username`, `displayName`, `password`, submit/submitting.

- [ ] **Step 4: Update login/page.tsx**

```tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <LoginForm onSuccess={() => router.push("/profile")} />
      <p className="text-muted-foreground text-sm">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-foreground underline">
          {t("createOne")}
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Update register/page.tsx**

Same pattern with `auth.register` keys (`title`, `haveAccount`, `logIn`).

- [ ] **Step 6: Update verify/page.tsx**

Add `const t = useTranslations("auth.verify");` inside `VerifyContent`, replace the four literal `<p>` strings with `t("missingToken")`, `t("verifying")`, `t("invalid")`, `t("success")`. The `Suspense` fallback in `VerifyPage` also needs a translation — since it's outside `NextIntlClientProvider`'s nearest hook-usable scope is fine (provider wraps at root), just add `const t = useTranslations("auth.verify")` there too.

- [ ] **Step 7: Check and update existing test files**

Read `components/auth/login-form.test.tsx`, `components/auth/register-form.test.tsx`, and any page-level tests for `login`/`register`/`verify`. If they assert on exact English text (e.g. `getByText("Log in")`), wrap the render with `NextIntlClientProvider` (see Task 2's test for the pattern) and keep assertions since default locale is `en` — text stays identical. If a test doesn't already wrap with a provider, add the wrapper; if `getByRole` used a `name` matcher against text that's now a translation key, no change needed since translated English strings are unchanged wording.

- [ ] **Step 8: Run tests**

Run: `pnpm test`
Expected: PASS (all existing auth tests still green after adding provider wrappers)

- [ ] **Step 9: Run lint + typecheck + build**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add app/\(auth\)/ components/auth/ messages/
git commit -m "refactor(i18n): migrate auth pages/forms to next-intl"
```

---

### Task 4: Migrate Block 1 profile strings (profile page, forms, delete-account section)

**Files:**

- Modify: `app/(app)/profile/page.tsx`
- Modify: `components/profile/profile-form.tsx`
- Modify: `components/profile/change-password-form.tsx`
- Modify: `components/profile/delete-account-section.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `profile` namespace)
- Modify corresponding `*.test.tsx` files to wrap with `NextIntlClientProvider`

**Interfaces:**

- Consumes: `useTranslations("profile")`.
- Produces: `profile.*` keys: `title`, `changePasswordTitle`, `dangerZoneTitle`, `displayName`, `bio`, `saveChanges`, `saving`, `updated`, `currentPassword`, `newPassword`, `changePassword`, `changing`, `changed`, `deleteAccount`, `deleteConfirmTitle`, `deleteConfirmDescription`, `confirmDeletion`, `cancelDeletion`, `scheduledDeletionNotice` (with `{date}` param), `loadingProfile`.

- [ ] **Step 1: Add message keys**

`messages/en.json`:

```json
"profile": {
  "title": "Profile",
  "loadingProfile": "Loading profile...",
  "displayName": "Display name",
  "bio": "Bio",
  "saveChanges": "Save changes",
  "saving": "Saving...",
  "updated": "Profile updated.",
  "changePasswordTitle": "Change password",
  "currentPassword": "Current password",
  "newPassword": "New password",
  "changePassword": "Change password",
  "changing": "Changing...",
  "changed": "Password changed.",
  "dangerZoneTitle": "Danger zone",
  "deleteAccount": "Delete account",
  "deleteConfirmTitle": "Delete your account?",
  "deleteConfirmDescription": "Your account will be scheduled for deletion and permanently removed after a 30-day grace period. You can cancel any time before then.",
  "confirmDeletion": "Confirm deletion",
  "cancelDeletion": "Cancel deletion",
  "scheduledDeletionNotice": "Your account is scheduled for deletion on {date}."
}
```

`messages/uk.json`:

```json
"profile": {
  "title": "Профіль",
  "loadingProfile": "Завантаження профілю...",
  "displayName": "Відображуване ім'я",
  "bio": "Про себе",
  "saveChanges": "Зберегти зміни",
  "saving": "Збереження...",
  "updated": "Профіль оновлено.",
  "changePasswordTitle": "Змінити пароль",
  "currentPassword": "Поточний пароль",
  "newPassword": "Новий пароль",
  "changePassword": "Змінити пароль",
  "changing": "Зміна...",
  "changed": "Пароль змінено.",
  "dangerZoneTitle": "Небезпечна зона",
  "deleteAccount": "Видалити обліковий запис",
  "deleteConfirmTitle": "Видалити ваш обліковий запис?",
  "deleteConfirmDescription": "Ваш обліковий запис буде заплановано до видалення та остаточно видалено після 30-денного пільгового періоду. Ви можете скасувати в будь-який час до цього.",
  "confirmDeletion": "Підтвердити видалення",
  "cancelDeletion": "Скасувати видалення",
  "scheduledDeletionNotice": "Ваш обліковий запис заплановано до видалення {date}."
}
```

- [ ] **Step 2: Update profile-form.tsx**

`useTranslations("profile")`, replace `"Display name"` → `t("displayName")`, `"Bio"` → `t("bio")`, button ternary → `t("saving")`/`t("saveChanges")`, success text → `t("updated")`.

- [ ] **Step 3: Update change-password-form.tsx**

`useTranslations("profile")`, replace labels/button/status text with `currentPassword`, `newPassword`, `changing`/`changePassword`, `changed`.

- [ ] **Step 4: Update delete-account-section.tsx**

`useTranslations("profile")`. Note the `scheduledDeletionNotice` uses ICU interpolation — replace:

```tsx
<p className="text-sm">
  {t("scheduledDeletionNotice", { date: new Date(scheduledAt as string).toLocaleDateString() })}
</p>
```

Replace `"Cancel deletion"`, `"Delete account"`, dialog title/description, `"Confirm deletion"` with corresponding `t(...)` calls.

- [ ] **Step 5: Update profile/page.tsx**

`useTranslations("profile")`, replace `"Loading profile..."`, `"Profile"`, `"Change password"`, `"Danger zone"` card titles with `t(...)`.

- [ ] **Step 6: Update test files**

Read and update `components/profile/profile-form.test.tsx`, `change-password-form.test.tsx`, `delete-account-section.test.tsx`, and any `profile/page.test.tsx` — wrap renders with `NextIntlClientProvider` using `enMessages` per Task 2's pattern.

- [ ] **Step 7: Run tests, lint, typecheck, build**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/profile/ components/profile/ messages/
git commit -m "refactor(i18n): migrate profile pages/forms to next-intl"
```

---

## Phase 2 — API Client Layer

### Task 5: Extend shared types with catalog schemas

**Files:**

- Modify: `lib/api/types.ts`

**Interfaces:**

- Produces: all TypeScript interfaces below, used verbatim by every subsequent task's API client files.

- [ ] **Step 1: Append catalog types to `lib/api/types.ts`**

```ts
// --- Catalog domain types ---

export type ContributorRole =
  | "author"
  | "co_author"
  | "translator"
  | "illustrator"
  | "editor"
  | "narrator"
  | "foreword"
  | "other";

export type ReleaseFormat = "hardcover" | "paperback" | "ebook" | "audiobook" | "other";

export type ISBNKind = "isbn10" | "isbn13" | "asin" | "other";

export type EntityType = "book" | "release" | "contributor";

export type ChangeSource = "admin" | "contribution" | "external_sync" | "system";

export type ReviewSort = "created_at" | "rating";

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface BookResponse {
  id: string;
  title: string;
  original_title: string | null;
  original_language: string | null;
  first_publication_year: number | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ISBNResponse {
  id: string;
  code_normalized: string;
  code_original: string;
  kind: ISBNKind;
}

export interface ReleaseWithISBNsResponse {
  id: string;
  format: ReleaseFormat;
  publisher: string;
  published_year: number | null;
  language: string;
  page_count: number | null;
  duration_minutes: number | null;
  cover_image_url: string | null;
  description_override: string | null;
  isbns: ISBNResponse[];
  average_rating: number | null;
  rating_count: number;
}

export interface BookWithReleasesResponse extends BookResponse {
  releases: ReleaseWithISBNsResponse[];
  average_rating: number | null;
  rating_count: number;
}

export interface CreateBookPayload {
  title: string;
  original_title?: string | null;
  original_language?: string | null;
  first_publication_year?: number | null;
  description: string;
}

export interface UpdateBookPayload {
  title?: string;
  original_title?: string | null;
  original_language?: string | null;
  first_publication_year?: number | null;
  description?: string;
}

export interface CreateReleasePayload {
  book_id: string;
  format: ReleaseFormat;
  publisher: string;
  published_year?: number | null;
  language: string;
  page_count?: number | null;
  duration_minutes?: number | null;
  cover_image_url?: string | null;
  description_override?: string | null;
}

export interface UpdateReleasePayload {
  format?: ReleaseFormat;
  publisher?: string;
  published_year?: number | null;
  language?: string;
  page_count?: number | null;
  duration_minutes?: number | null;
  cover_image_url?: string | null;
  description_override?: string | null;
}

export interface AddContributorPayload {
  contributor_id: string;
  role: ContributorRole;
}

export interface AddContributorResult {
  status: "created" | "already_existed";
}

export interface ContributorResponse {
  id: string;
  full_name: string;
  sort_name: string;
  birth_year: number | null;
  death_year: number | null;
  bio: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ContributorBookSummary {
  id: string;
  title: string;
}

export interface ContributorReleaseSummary {
  id: string;
  format: ReleaseFormat;
  publisher: string;
  language: string;
}

export interface ContributorDetailResponse extends ContributorResponse {
  books_by_role: Partial<Record<ContributorRole, ContributorBookSummary[]>>;
  releases_by_role: Partial<Record<ContributorRole, ContributorReleaseSummary[]>>;
}

export interface CreateContributorPayload {
  full_name: string;
  sort_name: string;
  birth_year?: number | null;
  death_year?: number | null;
  bio?: string | null;
}

export interface UpdateContributorPayload {
  full_name?: string;
  sort_name?: string;
  birth_year?: number | null;
  death_year?: number | null;
  bio?: string | null;
}

export interface ExternalSearchHit {
  source: string;
  title: string;
  isbns: string[];
  authors: string[];
  cover_image_url: string | null;
}

export interface ExternalSearchResponse {
  query: string;
  hits: ExternalSearchHit[];
  partial_failures: Record<string, string>;
}

export interface ImportBookPayload {
  source: string;
  source_id: string;
}

export interface EntityVersionResponse {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  version_number: number;
  changed_by_user_id: string | null;
  change_source: ChangeSource;
  contribution_id: string | null;
  created_at: string;
}

export interface EntityVersionDetailResponse extends EntityVersionResponse {
  snapshot: Record<string, unknown>;
}

export interface ReviewResponse {
  id: string;
  user_id: string | null;
  book_id: string | null;
  release_id: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  is_public: boolean;
  contains_spoilers: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookListParams {
  skip?: number;
  limit?: number;
  title?: string;
  author?: string;
  language?: string;
}

export interface ContributorListParams {
  skip?: number;
  limit?: number;
  name?: string;
  role?: ContributorRole;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no consumers yet, just new exported types)

- [ ] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(catalog): add books/releases/contributors/external types"
```

---

### Task 6: Books public API client

**Files:**

- Create: `lib/api/books.ts`

**Interfaces:**

- Consumes: `apiClient` from `lib/api/client.ts`; types from Task 5.
- Produces: `listBooks`, `getBookByIsbn`, `getBook`, `getBookReviews`, `getBookHistory`, `getBookVersion` — exact names/signatures used by `hooks/useBooks.ts` (Task 9).

- [ ] **Step 1: Implement**

```ts
// lib/api/books.ts
import { apiClient } from "./client";
import type {
  BookListParams,
  BookWithReleasesResponse,
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
  ReviewResponse,
  ReviewSort,
} from "./types";

export async function listBooks(
  params: BookListParams = {},
): Promise<Page<BookWithReleasesResponse>> {
  const { data } = await apiClient.get("/books", { params });
  return data;
}

export async function getBookByIsbn(isbn: string): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.get(`/books/by-isbn/${encodeURIComponent(isbn)}`);
  return data;
}

export async function getBook(bookId: string): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.get(`/books/${bookId}`);
  return data;
}

export async function getBookReviews(
  bookId: string,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
): Promise<Page<ReviewResponse>> {
  const { data } = await apiClient.get(`/books/${bookId}/reviews`, { params });
  return data;
}

export async function getBookHistory(
  bookId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<EntityVersionResponse>> {
  const { data } = await apiClient.get(`/books/${bookId}/history`, { params });
  return data;
}

export async function getBookVersion(
  bookId: string,
  version: number,
): Promise<EntityVersionDetailResponse> {
  const { data } = await apiClient.get(`/books/${bookId}/history/${version}`);
  return data;
}
```

Note: `listBooks` response items are typed `BookWithReleasesResponse` because the design doc lists `BookResponse` for the list endpoint per the API report, but browsing needs release/cover data for cards — verify against the live API report: the API report states `GET /books/` returns `Page<BookResponse>` (no releases). Use `Page<BookResponse>` instead — correct the import and return type to `BookResponse`, not `BookWithReleasesResponse`, to match the real API contract. BookCard components (Task 12) will not have release/cover data from the list endpoint and must handle that (title/description/rating only from list view; full detail on click-through).

- [ ] **Step 2: Fix the type per the note above**

````ts
import type {
  BookListParams,
  BookResponse,
  BookWithReleasesResponse,
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
  ReviewResponse,
  ReviewSort,
} from "./types";

export async function listBooks(params: BookListParams = {}): Promise<Page<BookResponse>> {
  const { data } = await apiClient.get("/books", { params });
  return data;
}
```//keep the rest of the file as in Step 1, only `listBooks`'s return type and the `BookResponse` import change.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/api/books.ts
git commit -m "feat(catalog): add public books API client"
````

---

### Task 7: Releases, contributors, external public API clients

**Files:**

- Create: `lib/api/releases.ts`
- Create: `lib/api/contributors.ts`
- Create: `lib/api/external.ts`

**Interfaces:**

- Consumes: `apiClient`, types from Task 5.
- Produces: `getRelease`, `getReleaseReviews`, `getReleaseHistory`, `getReleaseVersion`; `listContributors`, `getContributor`, `getContributorBooks`, `getContributorHistory`, `getContributorVersion`; `searchExternal`.

- [ ] **Step 1: Implement releases.ts**

```ts
// lib/api/releases.ts
import { apiClient } from "./client";
import type {
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
  ReleaseWithISBNsResponse,
  ReviewResponse,
  ReviewSort,
} from "./types";

export async function getRelease(releaseId: string): Promise<ReleaseWithISBNsResponse> {
  const { data } = await apiClient.get(`/releases/${releaseId}`);
  return data;
}

export async function getReleaseReviews(
  releaseId: string,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
): Promise<Page<ReviewResponse>> {
  const { data } = await apiClient.get(`/releases/${releaseId}/reviews`, { params });
  return data;
}

export async function getReleaseHistory(
  releaseId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<EntityVersionResponse>> {
  const { data } = await apiClient.get(`/releases/${releaseId}/history`, { params });
  return data;
}

export async function getReleaseVersion(
  releaseId: string,
  version: number,
): Promise<EntityVersionDetailResponse> {
  const { data } = await apiClient.get(`/releases/${releaseId}/history/${version}`);
  return data;
}
```

- [ ] **Step 2: Implement contributors.ts**

```ts
// lib/api/contributors.ts
import { apiClient } from "./client";
import type {
  BookResponse,
  ContributorDetailResponse,
  ContributorListParams,
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
} from "./types";

export async function listContributors(
  params: ContributorListParams = {},
): Promise<Page<import("./types").ContributorResponse>> {
  const { data } = await apiClient.get("/contributors", { params });
  return data;
}

export async function getContributor(contributorId: string): Promise<ContributorDetailResponse> {
  const { data } = await apiClient.get(`/contributors/${contributorId}`);
  return data;
}

export async function getContributorBooks(
  contributorId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<BookResponse>> {
  const { data } = await apiClient.get(`/contributors/${contributorId}/books`, { params });
  return data;
}

export async function getContributorHistory(
  contributorId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<EntityVersionResponse>> {
  const { data } = await apiClient.get(`/contributors/${contributorId}/history`, { params });
  return data;
}

export async function getContributorVersion(
  contributorId: string,
  version: number,
): Promise<EntityVersionDetailResponse> {
  const { data } = await apiClient.get(`/contributors/${contributorId}/history/${version}`);
  return data;
}
```

Clean up the inline `import("./types")` in `listContributors` — add `ContributorResponse` to the top-level type import instead:

```ts
import type {
  BookResponse,
  ContributorDetailResponse,
  ContributorListParams,
  ContributorResponse,
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
} from "./types";

export async function listContributors(
  params: ContributorListParams = {},
): Promise<Page<ContributorResponse>> {
  const { data } = await apiClient.get("/contributors", { params });
  return data;
}
```

- [ ] **Step 3: Implement external.ts**

```ts
// lib/api/external.ts
import { apiClient } from "./client";
import type { ExternalSearchResponse } from "./types";

export async function searchExternal(
  query: string,
  sources?: string[],
): Promise<ExternalSearchResponse> {
  const { data } = await apiClient.get("/external/search", {
    params: { q: query, sources: sources?.join(",") },
  });
  return data;
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/api/releases.ts lib/api/contributors.ts lib/api/external.ts
git commit -m "feat(catalog): add public releases/contributors/external API clients"
```

---

### Task 8: Admin API clients (books, releases, contributors, external import)

**Files:**

- Create: `lib/api/books-admin.ts`
- Create: `lib/api/releases-admin.ts`
- Create: `lib/api/contributors-admin.ts`
- Modify: `lib/api/external.ts` (add `importBook`)

**Interfaces:**

- Produces: `createBook`, `updateBook`, `deleteBook`, `mergeBooks`, `addBookContributor`, `removeBookContributor`; `createRelease`, `updateRelease`, `addReleaseContributor`, `removeReleaseContributor`; `createContributor`, `updateContributor`; `importBook`.

- [ ] **Step 1: Implement books-admin.ts**

```ts
// lib/api/books-admin.ts
import { apiClient } from "./client";
import type {
  AddContributorPayload,
  AddContributorResult,
  BookResponse,
  BookWithReleasesResponse,
  ContributorRole,
  CreateBookPayload,
  UpdateBookPayload,
} from "./types";

export async function createBook(payload: CreateBookPayload): Promise<BookResponse> {
  const { data } = await apiClient.post("/books", payload);
  return data;
}

export async function updateBook(
  bookId: string,
  payload: UpdateBookPayload,
): Promise<BookResponse> {
  const { data } = await apiClient.patch(`/books/${bookId}`, payload);
  return data;
}

export async function deleteBook(bookId: string): Promise<void> {
  await apiClient.delete(`/books/${bookId}`);
}

export async function mergeBooks(
  sourceId: string,
  targetId: string,
): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.post(`/books/${sourceId}/merge-into/${targetId}`);
  return data;
}

export async function addBookContributor(
  bookId: string,
  payload: AddContributorPayload,
): Promise<AddContributorResult> {
  const { data } = await apiClient.post(`/books/${bookId}/contributors`, payload);
  return data;
}

export async function removeBookContributor(
  bookId: string,
  contributorId: string,
  role: ContributorRole,
): Promise<void> {
  await apiClient.delete(`/books/${bookId}/contributors/${contributorId}`, { params: { role } });
}
```

- [ ] **Step 2: Implement releases-admin.ts**

```ts
// lib/api/releases-admin.ts
import { apiClient } from "./client";
import type {
  AddContributorPayload,
  AddContributorResult,
  ContributorRole,
  CreateReleasePayload,
  ReleaseWithISBNsResponse,
  UpdateReleasePayload,
} from "./types";

export async function createRelease(
  payload: CreateReleasePayload,
): Promise<ReleaseWithISBNsResponse> {
  const { data } = await apiClient.post("/releases", payload);
  return data;
}

export async function updateRelease(
  releaseId: string,
  payload: UpdateReleasePayload,
): Promise<ReleaseWithISBNsResponse> {
  const { data } = await apiClient.patch(`/releases/${releaseId}`, payload);
  return data;
}

export async function addReleaseContributor(
  releaseId: string,
  payload: AddContributorPayload,
): Promise<AddContributorResult> {
  const { data } = await apiClient.post(`/releases/${releaseId}/contributors`, payload);
  return data;
}

export async function removeReleaseContributor(
  releaseId: string,
  contributorId: string,
  role: ContributorRole,
): Promise<void> {
  await apiClient.delete(`/releases/${releaseId}/contributors/${contributorId}`, {
    params: { role },
  });
}
```

- [ ] **Step 3: Implement contributors-admin.ts**

```ts
// lib/api/contributors-admin.ts
import { apiClient } from "./client";
import type {
  ContributorResponse,
  CreateContributorPayload,
  UpdateContributorPayload,
} from "./types";

export async function createContributor(
  payload: CreateContributorPayload,
): Promise<ContributorResponse> {
  const { data } = await apiClient.post("/contributors", payload);
  return data;
}

export async function updateContributor(
  contributorId: string,
  payload: UpdateContributorPayload,
): Promise<ContributorResponse> {
  const { data } = await apiClient.patch(`/contributors/${contributorId}`, payload);
  return data;
}
```

- [ ] **Step 4: Add importBook to external.ts**

Append to `lib/api/external.ts`:

```ts
import type { BookWithReleasesResponse, ImportBookPayload } from "./types";

export async function importBook(payload: ImportBookPayload): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.post("/external/import", payload);
  return data;
}
```

(Merge into the existing single `import type` line from Task 7 rather than duplicating it.)

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/api/books-admin.ts lib/api/releases-admin.ts lib/api/contributors-admin.ts lib/api/external.ts
git commit -m "feat(catalog): add admin API clients for books/releases/contributors/import"
```

---

## Phase 3 — Hooks

### Task 9: Public query hooks (books, releases, contributors, external)

**Files:**

- Create: `hooks/useBooks.ts`
- Create: `hooks/useReleases.ts`
- Create: `hooks/useContributors.ts`
- Create: `hooks/useExternalSearch.ts`
- Create: `hooks/useBooks.test.tsx`
- Create: `hooks/useReleases.test.tsx`
- Create: `hooks/useContributors.test.tsx`
- Create: `hooks/useExternalSearch.test.tsx`

**Interfaces:**

- Consumes: `lib/api/books.ts`, `lib/api/releases.ts`, `lib/api/contributors.ts`, `lib/api/external.ts` (Tasks 6-7).
- Produces: `useBookList(params)`, `useBook(bookId)`, `useBookReviews(bookId, params)`, `useBookHistory(bookId, params)`, `useBookVersion(bookId, version)`; `useRelease(releaseId)`, `useReleaseReviews`, `useReleaseHistory`, `useReleaseVersion`; `useContributorList(params)`, `useContributor(contributorId)`, `useContributorBooks`, `useContributorHistory`, `useContributorVersion`; `useExternalSearch(query, sources)`.

First check the existing hook test pattern before writing new tests:

- [ ] **Step 1: Read an existing hook test for the msw pattern**

Read `hooks/useMe.test.tsx` in full to copy its msw server setup pattern exactly (handlers, `QueryClientProvider` wrapper, `renderHook`).

- [ ] **Step 2: Write useBooks.ts**

```ts
// hooks/useBooks.ts
import { useQuery } from "@tanstack/react-query";
import {
  getBook,
  getBookByIsbn,
  getBookHistory,
  getBookReviews,
  getBookVersion,
  listBooks,
} from "@/lib/api/books";
import type { BookListParams, ReviewSort } from "@/lib/api/types";

export function useBookList(params: BookListParams = {}) {
  return useQuery({
    queryKey: ["books", params],
    queryFn: () => listBooks(params),
  });
}

export function useBook(bookId: string | undefined) {
  return useQuery({
    queryKey: ["books", bookId],
    queryFn: () => getBook(bookId as string),
    enabled: Boolean(bookId),
  });
}

export function useBookByIsbn(isbn: string | undefined) {
  return useQuery({
    queryKey: ["books", "by-isbn", isbn],
    queryFn: () => getBookByIsbn(isbn as string),
    enabled: Boolean(isbn),
  });
}

export function useBookReviews(
  bookId: string | undefined,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["books", bookId, "reviews", params],
    queryFn: () => getBookReviews(bookId as string, params),
    enabled: Boolean(bookId),
  });
}

export function useBookHistory(
  bookId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["books", bookId, "history", params],
    queryFn: () => getBookHistory(bookId as string, params),
    enabled: Boolean(bookId),
  });
}

export function useBookVersion(bookId: string | undefined, version: number | undefined) {
  return useQuery({
    queryKey: ["books", bookId, "history", version],
    queryFn: () => getBookVersion(bookId as string, version as number),
    enabled: Boolean(bookId) && version !== undefined,
  });
}
```

- [ ] **Step 3: Write useBooks.test.tsx**

```tsx
// hooks/useBooks.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { useBook, useBookList } from "./useBooks";

const server = setupServer(
  http.get("/api/books", () => {
    return HttpResponse.json({
      items: [{ id: "b1", title: "Dune" }],
      total: 1,
      limit: 10,
      offset: 0,
    });
  }),
  http.get("/api/books/:id", ({ params }) => {
    if (params.id === "missing") {
      return HttpResponse.json({ detail: "Book not found" }, { status: 404 });
    }
    return HttpResponse.json({ id: params.id, title: "Dune", releases: [] });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useBookList", () => {
  it("fetches a page of books", async () => {
    const { result } = renderHook(() => useBookList(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].title).toBe("Dune");
  });
});

describe("useBook", () => {
  it("fetches a book by id", async () => {
    const { result } = renderHook(() => useBook("b1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Dune");
  });

  it("surfaces a 404 error", async () => {
    const { result } = renderHook(() => useBook("missing"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not fetch when bookId is undefined", () => {
    const { result } = renderHook(() => useBook(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test useBooks`
Expected: PASS

- [ ] **Step 5: Write useReleases.ts**

```ts
// hooks/useReleases.ts
import { useQuery } from "@tanstack/react-query";
import {
  getRelease,
  getReleaseHistory,
  getReleaseReviews,
  getReleaseVersion,
} from "@/lib/api/releases";
import type { ReviewSort } from "@/lib/api/types";

export function useRelease(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["releases", releaseId],
    queryFn: () => getRelease(releaseId as string),
    enabled: Boolean(releaseId),
  });
}

export function useReleaseReviews(
  releaseId: string | undefined,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["releases", releaseId, "reviews", params],
    queryFn: () => getReleaseReviews(releaseId as string, params),
    enabled: Boolean(releaseId),
  });
}

export function useReleaseHistory(
  releaseId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["releases", releaseId, "history", params],
    queryFn: () => getReleaseHistory(releaseId as string, params),
    enabled: Boolean(releaseId),
  });
}

export function useReleaseVersion(releaseId: string | undefined, version: number | undefined) {
  return useQuery({
    queryKey: ["releases", releaseId, "history", version],
    queryFn: () => getReleaseVersion(releaseId as string, version as number),
    enabled: Boolean(releaseId) && version !== undefined,
  });
}
```

- [ ] **Step 6: Write useReleases.test.tsx**

Mirror Step 3's pattern with `http.get("/api/releases/:id", ...)` returning a `ReleaseWithISBNsResponse`-shaped body, and a not-found case. Assert `useRelease("r1")` resolves with expected `publisher` field, `useRelease(undefined)` stays idle.

- [ ] **Step 7: Write useContributors.ts**

```ts
// hooks/useContributors.ts
import { useQuery } from "@tanstack/react-query";
import {
  getContributor,
  getContributorBooks,
  getContributorHistory,
  getContributorVersion,
  listContributors,
} from "@/lib/api/contributors";
import type { ContributorListParams } from "@/lib/api/types";

export function useContributorList(params: ContributorListParams = {}) {
  return useQuery({
    queryKey: ["contributors", params],
    queryFn: () => listContributors(params),
  });
}

export function useContributor(contributorId: string | undefined) {
  return useQuery({
    queryKey: ["contributors", contributorId],
    queryFn: () => getContributor(contributorId as string),
    enabled: Boolean(contributorId),
  });
}

export function useContributorBooks(
  contributorId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["contributors", contributorId, "books", params],
    queryFn: () => getContributorBooks(contributorId as string, params),
    enabled: Boolean(contributorId),
  });
}

export function useContributorHistory(
  contributorId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["contributors", contributorId, "history", params],
    queryFn: () => getContributorHistory(contributorId as string, params),
    enabled: Boolean(contributorId),
  });
}

export function useContributorVersion(
  contributorId: string | undefined,
  version: number | undefined,
) {
  return useQuery({
    queryKey: ["contributors", contributorId, "history", version],
    queryFn: () => getContributorVersion(contributorId as string, version as number),
    enabled: Boolean(contributorId) && version !== undefined,
  });
}
```

- [ ] **Step 8: Write useContributors.test.tsx**

Mirror the pattern: `useContributorList()` resolves a `Page<ContributorResponse>`, `useContributor("c1")` resolves detail with `books_by_role`, undefined id stays idle.

- [ ] **Step 9: Write useExternalSearch.ts**

```ts
// hooks/useExternalSearch.ts
import { useQuery } from "@tanstack/react-query";
import { searchExternal } from "@/lib/api/external";

export function useExternalSearch(query: string, sources?: string[]) {
  return useQuery({
    queryKey: ["external", "search", query, sources],
    queryFn: () => searchExternal(query, sources),
    enabled: query.trim().length > 0,
  });
}
```

- [ ] **Step 10: Write useExternalSearch.test.tsx**

```tsx
// hooks/useExternalSearch.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { useExternalSearch } from "./useExternalSearch";

const server = setupServer(
  http.get("/api/external/search", ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      query: url.searchParams.get("q"),
      hits: [
        {
          source: "google_books",
          title: "Dune",
          isbns: ["123"],
          authors: ["Frank Herbert"],
          cover_image_url: null,
        },
      ],
      partial_failures: {},
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useExternalSearch", () => {
  it("searches when query is non-empty", async () => {
    const { result } = renderHook(() => useExternalSearch("dune"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.hits[0].title).toBe("Dune");
  });

  it("does not search when query is empty", () => {
    const { result } = renderHook(() => useExternalSearch(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 11: Run all new hook tests**

Run: `pnpm test hooks/useBooks hooks/useReleases hooks/useContributors hooks/useExternalSearch`
Expected: PASS

- [ ] **Step 12: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add hooks/useBooks.ts hooks/useBooks.test.tsx hooks/useReleases.ts hooks/useReleases.test.tsx hooks/useContributors.ts hooks/useContributors.test.tsx hooks/useExternalSearch.ts hooks/useExternalSearch.test.tsx
git commit -m "feat(catalog): add public query hooks for books/releases/contributors/external"
```

---

### Task 10: Admin mutation hooks

**Files:**

- Create: `hooks/useBookAdmin.ts`
- Create: `hooks/useReleaseAdmin.ts`
- Create: `hooks/useContributorAdmin.ts`
- Create: `hooks/useImportBook.ts`
- Create: `hooks/useBookAdmin.test.tsx`
- Create: `hooks/useImportBook.test.tsx`

**Interfaces:**

- Consumes: `lib/api/books-admin.ts`, `lib/api/releases-admin.ts`, `lib/api/contributors-admin.ts`, `lib/api/external.ts` (Task 8).
- Produces: `useCreateBook`, `useUpdateBook`, `useDeleteBook`, `useMergeBooks`, `useAddBookContributor`, `useRemoveBookContributor`; `useCreateRelease`, `useUpdateRelease`, `useAddReleaseContributor`, `useRemoveReleaseContributor`; `useCreateContributor`, `useUpdateContributor`; `useImportBook`.

- [ ] **Step 1: Write useBookAdmin.ts**

```ts
// hooks/useBookAdmin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addBookContributor,
  createBook,
  deleteBook,
  mergeBooks,
  removeBookContributor,
  updateBook,
} from "@/lib/api/books-admin";
import type {
  AddContributorPayload,
  ContributorRole,
  CreateBookPayload,
  UpdateBookPayload,
} from "@/lib/api/types";

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookPayload) => createBook(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBookPayload) => updateBook(bookId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => deleteBook(bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useMergeBooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      mergeBooks(sourceId, targetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useAddBookContributor(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddContributorPayload) => addBookContributor(bookId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books", bookId] }),
  });
}

export function useRemoveBookContributor(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contributorId, role }: { contributorId: string; role: ContributorRole }) =>
      removeBookContributor(bookId, contributorId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books", bookId] }),
  });
}
```

- [ ] **Step 2: Write useBookAdmin.test.tsx**

```tsx
// hooks/useBookAdmin.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { useCreateBook, useMergeBooks } from "./useBookAdmin";

const server = setupServer(
  http.post("/api/books", async ({ request }) => {
    const body = (await request.json()) as { title: string };
    return HttpResponse.json({ id: "new-book", title: body.title }, { status: 201 });
  }),
  http.post("/api/books/:sourceId/merge-into/:targetId", ({ params }) => {
    if (params.sourceId === params.targetId) {
      return HttpResponse.json({ detail: "Cannot merge a book into itself" }, { status: 409 });
    }
    return HttpResponse.json({ id: params.targetId, title: "Merged", releases: [] });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useCreateBook", () => {
  it("creates a book", async () => {
    const { result } = renderHook(() => useCreateBook(), { wrapper });
    act(() => result.current.mutate({ title: "Dune", description: "Sci-fi classic" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Dune");
  });
});

describe("useMergeBooks", () => {
  it("merges two distinct books", async () => {
    const { result } = renderHook(() => useMergeBooks(), { wrapper });
    act(() => result.current.mutate({ sourceId: "a", targetId: "b" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("surfaces a 409 when merging a book into itself", async () => {
    const { result } = renderHook(() => useMergeBooks(), { wrapper });
    act(() => result.current.mutate({ sourceId: "a", targetId: "a" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 3: Run test**

Run: `pnpm test useBookAdmin`
Expected: PASS

- [ ] **Step 4: Write useReleaseAdmin.ts**

```ts
// hooks/useReleaseAdmin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addReleaseContributor,
  createRelease,
  removeReleaseContributor,
  updateRelease,
} from "@/lib/api/releases-admin";
import type {
  AddContributorPayload,
  ContributorRole,
  CreateReleasePayload,
  UpdateReleasePayload,
} from "@/lib/api/types";

export function useCreateRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReleasePayload) => createRelease(payload),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["books", variables.book_id] }),
  });
}

export function useUpdateRelease(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateReleasePayload) => updateRelease(releaseId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["releases", releaseId] }),
  });
}

export function useAddReleaseContributor(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddContributorPayload) => addReleaseContributor(releaseId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["releases", releaseId] }),
  });
}

export function useRemoveReleaseContributor(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contributorId, role }: { contributorId: string; role: ContributorRole }) =>
      removeReleaseContributor(releaseId, contributorId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["releases", releaseId] }),
  });
}
```

- [ ] **Step 5: Write useContributorAdmin.ts**

```ts
// hooks/useContributorAdmin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContributor, updateContributor } from "@/lib/api/contributors-admin";
import type { CreateContributorPayload, UpdateContributorPayload } from "@/lib/api/types";

export function useCreateContributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContributorPayload) => createContributor(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributors"] }),
  });
}

export function useUpdateContributor(contributorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateContributorPayload) => updateContributor(contributorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributors", contributorId] });
      queryClient.invalidateQueries({ queryKey: ["contributors"] });
    },
  });
}
```

- [ ] **Step 6: Write useImportBook.ts**

```ts
// hooks/useImportBook.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importBook } from "@/lib/api/external";
import type { ImportBookPayload } from "@/lib/api/types";

export function useImportBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportBookPayload) => importBook(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}
```

- [ ] **Step 7: Write useImportBook.test.tsx**

```tsx
// hooks/useImportBook.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { useImportBook } from "./useImportBook";

const server = setupServer(
  http.post("/api/external/import", () => {
    return HttpResponse.json({
      id: "imported-1",
      title: "Imported Book",
      releases: [],
      average_rating: null,
      rating_count: 0,
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useImportBook", () => {
  it("imports a book and returns default rating fields", async () => {
    const { result } = renderHook(() => useImportBook(), { wrapper });
    act(() => result.current.mutate({ source: "google_books", source_id: "abc123" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.rating_count).toBe(0);
    expect(result.current.data?.average_rating).toBeNull();
  });
});
```

- [ ] **Step 8: Run all new tests**

Run: `pnpm test hooks/useBookAdmin hooks/useImportBook`
Expected: PASS

- [ ] **Step 9: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add hooks/useBookAdmin.ts hooks/useBookAdmin.test.tsx hooks/useReleaseAdmin.ts hooks/useContributorAdmin.ts hooks/useImportBook.ts hooks/useImportBook.test.tsx
git commit -m "feat(catalog): add admin mutation hooks for books/releases/contributors/import"
```

---

## Phase 4 — Public Catalog Components & Pages

> **Note for the executor of this phase:** add `catalog` namespace keys to `messages/en.json`/`messages/uk.json` incrementally, one sub-task per component, following the exact pattern established in Phase 1 Task 3/4 (English value, Ukrainian translation, wired via `useTranslations("catalog.xxx")`). Each task below lists the exact keys it needs; add them in that task's steps, don't pre-declare a giant block.

### Task 11: BookCard component

**Files:**

- Create: `components/catalog/book-card.tsx`
- Create: `components/catalog/book-card.stories.tsx`
- Create: `components/catalog/book-card.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.book` namespace)

**Interfaces:**

- Consumes: `BookResponse` type from `lib/api/types.ts`.
- Produces: `BookCard({ book: BookResponse }): JSX.Element`, used by `books/page.tsx` (Task 15).

- [ ] **Step 1: Add message keys**

`messages/en.json`, add `catalog.book`:

```json
"catalog": {
  "book": {
    "noDescription": "No description available.",
    "publishedYear": "Published {year}"
  }
}
```

`messages/uk.json`:

```json
"catalog": {
  "book": {
    "noDescription": "Опис відсутній.",
    "publishedYear": "Опубліковано {year}"
  }
}
```

- [ ] **Step 2: Write test**

```tsx
// components/catalog/book-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { BookCard } from "./book-card";
import enMessages from "@/messages/en.json";
import type { BookResponse } from "@/lib/api/types";

const book: BookResponse = {
  id: "b1",
  title: "Dune",
  original_title: null,
  original_language: null,
  first_publication_year: 1965,
  description: "A sci-fi epic.",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderCard(overrides: Partial<BookResponse> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <BookCard book={{ ...book, ...overrides }} />
    </NextIntlClientProvider>,
  );
}

describe("BookCard", () => {
  it("renders title and publication year", () => {
    renderCard();
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.getByText(/1965/)).toBeInTheDocument();
  });

  it("links to the book detail page", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/books/b1");
  });

  it("shows a fallback when description is empty", () => {
    renderCard({ description: "" });
    expect(screen.getByText("No description available.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test book-card`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement component**

```tsx
// components/catalog/book-card.tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookResponse } from "@/lib/api/types";

export function BookCard({ book }: { book: BookResponse }) {
  const t = useTranslations("catalog.book");

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="hover:border-foreground/30 h-full transition-colors">
        <CardHeader>
          <CardTitle className="line-clamp-2">{book.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {book.description || t("noDescription")}
          </p>
          {book.first_publication_year && (
            <p className="text-muted-foreground text-xs">
              {t("publishedYear", { year: book.first_publication_year })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test book-card`
Expected: PASS

- [ ] **Step 6: Write story**

```tsx
// components/catalog/book-card.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { BookCard } from "./book-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof BookCard> = {
  title: "Catalog/BookCard",
  component: BookCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-xs">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseBook = {
  id: "b1",
  title: "Dune",
  original_title: null,
  original_language: null,
  first_publication_year: 1965,
  description: "A sci-fi epic about politics, religion, and ecology on a desert planet.",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Default: StoryObj<typeof BookCard> = { args: { book: baseBook } };

export const NoDescription: StoryObj<typeof BookCard> = {
  args: { book: { ...baseBook, description: "" } },
};

export const NoPublicationYear: StoryObj<typeof BookCard> = {
  args: { book: { ...baseBook, first_publication_year: null } },
};
```

- [ ] **Step 7: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add components/catalog/book-card.tsx components/catalog/book-card.stories.tsx components/catalog/book-card.test.tsx messages/
git commit -m "feat(catalog): add BookCard component"
```

---

### Task 12: BookSearchFilters component

**Files:**

- Create: `components/catalog/book-search-filters.tsx`
- Create: `components/catalog/book-search-filters.stories.tsx`
- Create: `components/catalog/book-search-filters.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.filters` namespace)

**Interfaces:**

- Produces: `BookSearchFilters({ value: BookListParams, onChange: (params: BookListParams) => void }): JSX.Element`, consumed by `books/page.tsx` (Task 15).

- [ ] **Step 1: Add message keys**

`messages/en.json` under `catalog`:

```json
"filters": {
  "titleLabel": "Title",
  "authorLabel": "Author",
  "languageLabel": "Language",
  "titlePlaceholder": "Search by title",
  "authorPlaceholder": "Search by author",
  "languagePlaceholder": "e.g. en"
}
```

`messages/uk.json`:

```json
"filters": {
  "titleLabel": "Назва",
  "authorLabel": "Автор",
  "languageLabel": "Мова",
  "titlePlaceholder": "Пошук за назвою",
  "authorPlaceholder": "Пошук за автором",
  "languagePlaceholder": "напр. en"
}
```

- [ ] **Step 2: Write test**

```tsx
// components/catalog/book-search-filters.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { BookSearchFilters } from "./book-search-filters";
import enMessages from "@/messages/en.json";

function renderFilters(onChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <BookSearchFilters value={{}} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe("BookSearchFilters", () => {
  it("calls onChange with title when typed", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters();
    await user.type(screen.getByLabelText("Title"), "Dune");
    expect(onChange).toHaveBeenLastCalledWith({ title: "Dune" });
  });

  it("calls onChange with author when typed", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters();
    await user.type(screen.getByLabelText("Author"), "Herbert");
    expect(onChange).toHaveBeenLastCalledWith({ author: "Herbert" });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test book-search-filters`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement component**

```tsx
// components/catalog/book-search-filters.tsx
"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { BookListParams } from "@/lib/api/types";

export function BookSearchFilters({
  value,
  onChange,
}: {
  value: BookListParams;
  onChange: (params: BookListParams) => void;
}) {
  const t = useTranslations("catalog.filters");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <Input
          id="filter-title"
          placeholder={t("titlePlaceholder")}
          value={value.title ?? ""}
          onChange={(e) => onChange({ ...value, title: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-author" className="text-sm font-medium">
          {t("authorLabel")}
        </label>
        <Input
          id="filter-author"
          placeholder={t("authorPlaceholder")}
          value={value.author ?? ""}
          onChange={(e) => onChange({ ...value, author: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-language" className="text-sm font-medium">
          {t("languageLabel")}
        </label>
        <Input
          id="filter-language"
          placeholder={t("languagePlaceholder")}
          value={value.language ?? ""}
          onChange={(e) => onChange({ ...value, language: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test book-search-filters`
Expected: PASS

- [ ] **Step 6: Write story**

```tsx
// components/catalog/book-search-filters.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { BookSearchFilters } from "./book-search-filters";
import enMessages from "@/messages/en.json";
import type { BookListParams } from "@/lib/api/types";

const meta: Meta<typeof BookSearchFilters> = {
  title: "Catalog/BookSearchFilters",
  component: BookSearchFilters,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

function Interactive() {
  const [value, setValue] = useState<BookListParams>({});
  return <BookSearchFilters value={value} onChange={setValue} />;
}

export const Default: StoryObj<typeof BookSearchFilters> = { render: () => <Interactive /> };
```

- [ ] **Step 7: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add components/catalog/book-search-filters.tsx components/catalog/book-search-filters.stories.tsx components/catalog/book-search-filters.test.tsx messages/
git commit -m "feat(catalog): add BookSearchFilters component"
```

---

### Task 13: ReleaseCard and ReviewList components

**Files:**

- Create: `components/catalog/release-card.tsx`
- Create: `components/catalog/release-card.stories.tsx`
- Create: `components/catalog/release-card.test.tsx`
- Create: `components/catalog/review-list.tsx`
- Create: `components/catalog/review-list.stories.tsx`
- Create: `components/catalog/review-list.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.release`, `catalog.reviews` namespaces)

**Interfaces:**

- Produces: `ReleaseCard({ release: ReleaseWithISBNsResponse }): JSX.Element`; `ReviewList({ reviews: ReviewResponse[], isLoading: boolean }): JSX.Element` — both consumed by book detail page (Task 15).

- [ ] **Step 1: Add message keys**

`messages/en.json`:

```json
"release": {
  "format": {
    "hardcover": "Hardcover",
    "paperback": "Paperback",
    "ebook": "Ebook",
    "audiobook": "Audiobook",
    "other": "Other"
  },
  "noRating": "Not yet rated",
  "ratingCount": "{count, plural, =0 {No ratings} one {# rating} other {# ratings}}"
},
"reviews": {
  "empty": "No reviews yet.",
  "spoilerWarning": "Contains spoilers",
  "loading": "Loading reviews..."
}
```

`messages/uk.json`:

```json
"release": {
  "format": {
    "hardcover": "Тверда палітурка",
    "paperback": "М'яка палітурка",
    "ebook": "Електронна книга",
    "audiobook": "Аудіокнига",
    "other": "Інше"
  },
  "noRating": "Ще немає оцінок",
  "ratingCount": "{count, plural, =0 {Немає оцінок} one {# оцінка} other {# оцінок}}"
},
"reviews": {
  "empty": "Ще немає відгуків.",
  "spoilerWarning": "Містить спойлери",
  "loading": "Завантаження відгуків..."
}
```

- [ ] **Step 2: Write release-card test**

```tsx
// components/catalog/release-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { ReleaseCard } from "./release-card";
import enMessages from "@/messages/en.json";
import type { ReleaseWithISBNsResponse } from "@/lib/api/types";

const release: ReleaseWithISBNsResponse = {
  id: "r1",
  format: "hardcover",
  publisher: "Ace Books",
  published_year: 1965,
  language: "en",
  page_count: 412,
  duration_minutes: null,
  cover_image_url: null,
  description_override: null,
  isbns: [],
  average_rating: 4.5,
  rating_count: 10,
};

function renderCard(overrides: Partial<ReleaseWithISBNsResponse> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ReleaseCard release={{ ...release, ...overrides }} />
    </NextIntlClientProvider>,
  );
}

describe("ReleaseCard", () => {
  it("renders publisher and format", () => {
    renderCard();
    expect(screen.getByText("Ace Books")).toBeInTheDocument();
    expect(screen.getByText("Hardcover")).toBeInTheDocument();
  });

  it("shows a rating count when rated", () => {
    renderCard();
    expect(screen.getByText("10 ratings")).toBeInTheDocument();
  });

  it("shows a fallback when unrated", () => {
    renderCard({ average_rating: null, rating_count: 0 });
    expect(screen.getByText("Not yet rated")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement ReleaseCard**

```tsx
// components/catalog/release-card.tsx
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReleaseWithISBNsResponse } from "@/lib/api/types";

export function ReleaseCard({ release }: { release: ReleaseWithISBNsResponse }) {
  const t = useTranslations("catalog.release");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{release.publisher}</CardTitle>
        <Badge variant="secondary">{t(`format.${release.format}`)}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        {release.published_year && <p>{release.published_year}</p>}
        <p className="text-muted-foreground">
          {release.rating_count > 0
            ? t("ratingCount", { count: release.rating_count })
            : t("noRating")}
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run release-card test**

Run: `pnpm test release-card`
Expected: PASS

- [ ] **Step 5: Write release-card story**

```tsx
// components/catalog/release-card.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ReleaseCard } from "./release-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReleaseCard> = {
  title: "Catalog/ReleaseCard",
  component: ReleaseCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseRelease = {
  id: "r1",
  format: "hardcover" as const,
  publisher: "Ace Books",
  published_year: 1965,
  language: "en",
  page_count: 412,
  duration_minutes: null,
  cover_image_url: null,
  description_override: null,
  isbns: [],
  average_rating: 4.5,
  rating_count: 10,
};

export const Default: StoryObj<typeof ReleaseCard> = { args: { release: baseRelease } };
export const Unrated: StoryObj<typeof ReleaseCard> = {
  args: { release: { ...baseRelease, average_rating: null, rating_count: 0 } },
};
export const Audiobook: StoryObj<typeof ReleaseCard> = {
  args: {
    release: { ...baseRelease, format: "audiobook", duration_minutes: 620, page_count: null },
  },
};
```

- [ ] **Step 6: Write review-list test**

```tsx
// components/catalog/review-list.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";
import type { ReviewResponse } from "@/lib/api/types";

const review: ReviewResponse = {
  id: "rev1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  rating: 5,
  title: "Loved it",
  body: "Great book.",
  is_public: true,
  contains_spoilers: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderList(reviews: ReviewResponse[], isLoading = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ReviewList reviews={reviews} isLoading={isLoading} />
    </NextIntlClientProvider>,
  );
}

describe("ReviewList", () => {
  it("renders review titles", () => {
    renderList([review]);
    expect(screen.getByText("Loved it")).toBeInTheDocument();
  });

  it("shows a spoiler warning badge when applicable", () => {
    renderList([{ ...review, contains_spoilers: true }]);
    expect(screen.getByText("Contains spoilers")).toBeInTheDocument();
  });

  it("shows an empty state with no reviews", () => {
    renderList([]);
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    renderList([], true);
    expect(screen.getByText("Loading reviews...")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Implement ReviewList**

```tsx
// components/catalog/review-list.tsx
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewResponse } from "@/lib/api/types";

export function ReviewList({
  reviews,
  isLoading,
}: {
  reviews: ReviewResponse[];
  isLoading: boolean;
}) {
  const t = useTranslations("catalog.reviews");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label={t("loading")}>
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="border-border flex flex-col gap-1 border-b pb-4 last:border-b-0"
        >
          <div className="flex items-center gap-2">
            {review.title && <p className="font-medium">{review.title}</p>}
            {review.contains_spoilers && <Badge variant="outline">{t("spoilerWarning")}</Badge>}
          </div>
          {review.body && <p className="text-muted-foreground text-sm">{review.body}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Run review-list test**

Run: `pnpm test review-list`
Expected: PASS

- [ ] **Step 9: Write review-list story**

```tsx
// components/catalog/review-list.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewList> = {
  title: "Catalog/ReviewList",
  component: ReviewList,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const reviews = [
  {
    id: "rev1",
    user_id: "u1",
    book_id: "b1",
    release_id: null,
    rating: 5,
    title: "Loved it",
    body: "Great book.",
    is_public: true,
    contains_spoilers: false,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  },
];

export const Default: StoryObj<typeof ReviewList> = { args: { reviews, isLoading: false } };
export const Empty: StoryObj<typeof ReviewList> = { args: { reviews: [], isLoading: false } };
export const Loading: StoryObj<typeof ReviewList> = { args: { reviews: [], isLoading: true } };
```

- [ ] **Step 10: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add components/catalog/release-card.tsx components/catalog/release-card.stories.tsx components/catalog/release-card.test.tsx components/catalog/review-list.tsx components/catalog/review-list.stories.tsx components/catalog/review-list.test.tsx messages/
git commit -m "feat(catalog): add ReleaseCard and ReviewList components"
```

---

### Task 14: ContributorCard component

**Files:**

- Create: `components/catalog/contributor-card.tsx`
- Create: `components/catalog/contributor-card.stories.tsx`
- Create: `components/catalog/contributor-card.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.contributor` namespace)

**Interfaces:**

- Produces: `ContributorCard({ contributor: ContributorResponse }): JSX.Element`.

- [ ] **Step 1: Add message keys**

`messages/en.json`:

```json
"contributor": {
  "noBio": "No biography available."
}
```

`messages/uk.json`:

```json
"contributor": {
  "noBio": "Біографія відсутня."
}
```

- [ ] **Step 2: Write test**

```tsx
// components/catalog/contributor-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { ContributorCard } from "./contributor-card";
import enMessages from "@/messages/en.json";
import type { ContributorResponse } from "@/lib/api/types";

const contributor: ContributorResponse = {
  id: "c1",
  full_name: "Frank Herbert",
  sort_name: "Herbert, Frank",
  birth_year: 1920,
  death_year: 1986,
  bio: "American science fiction writer.",
  slug: "frank-herbert",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

describe("ContributorCard", () => {
  it("renders name and links to detail page", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ContributorCard contributor={contributor} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Frank Herbert")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/contributors/c1");
  });

  it("shows a fallback when bio is missing", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ContributorCard contributor={{ ...contributor, bio: null }} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No biography available.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement component**

```tsx
// components/catalog/contributor-card.tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributorResponse } from "@/lib/api/types";

export function ContributorCard({ contributor }: { contributor: ContributorResponse }) {
  const t = useTranslations("catalog.contributor");

  return (
    <Link href={`/contributors/${contributor.id}`}>
      <Card className="hover:border-foreground/30 h-full transition-colors">
        <CardHeader>
          <CardTitle>{contributor.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {contributor.bio || t("noBio")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test contributor-card`
Expected: PASS

- [ ] **Step 5: Write story**

```tsx
// components/catalog/contributor-card.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ContributorCard } from "./contributor-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ContributorCard> = {
  title: "Catalog/ContributorCard",
  component: ContributorCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-xs">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseContributor = {
  id: "c1",
  full_name: "Frank Herbert",
  sort_name: "Herbert, Frank",
  birth_year: 1920,
  death_year: 1986,
  bio: "American science fiction writer, best known for Dune.",
  slug: "frank-herbert",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Default: StoryObj<typeof ContributorCard> = { args: { contributor: baseContributor } };
export const NoBio: StoryObj<typeof ContributorCard> = {
  args: { contributor: { ...baseContributor, bio: null } },
};
```

- [ ] **Step 6: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/catalog/contributor-card.tsx components/catalog/contributor-card.stories.tsx components/catalog/contributor-card.test.tsx messages/
git commit -m "feat(catalog): add ContributorCard component"
```

---

### Task 15: Public pages — books list, book detail, contributor detail

**Files:**

- Create: `app/(app)/books/page.tsx`
- Create: `app/(app)/books/[id]/page.tsx`
- Create: `app/(app)/contributors/[id]/page.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.pages` namespace)
- Modify: `components/shell/header.tsx` (point "Browse" nav link at `/books`)

**Interfaces:**

- Consumes: `useBookList`, `useBook` (Task 9), `BookCard`, `BookSearchFilters`, `ReleaseCard`, `ReviewList`, `ContributorCard` (Tasks 11-14), `useContributor`, `useContributorBooks` (Task 9).

- [ ] **Step 1: Add message keys**

`messages/en.json`:

```json
"pages": {
  "browseTitle": "Browse books",
  "loadingBooks": "Loading books...",
  "noBooksFound": "No books found.",
  "releasesTitle": "Editions",
  "reviewsTitle": "Reviews",
  "loadingBook": "Loading book...",
  "bookNotFound": "Book not found.",
  "contributorNotFound": "Contributor not found.",
  "booksByContributor": "Books"
}
```

`messages/uk.json`:

```json
"pages": {
  "browseTitle": "Переглянути книги",
  "loadingBooks": "Завантаження книг...",
  "noBooksFound": "Книг не знайдено.",
  "releasesTitle": "Видання",
  "reviewsTitle": "Відгуки",
  "loadingBook": "Завантаження книги...",
  "bookNotFound": "Книгу не знайдено.",
  "contributorNotFound": "Автора не знайдено.",
  "booksByContributor": "Книги"
}
```

- [ ] **Step 2: Implement books/page.tsx**

```tsx
// app/(app)/books/page.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useBookList } from "@/hooks/useBooks";
import { BookCard } from "@/components/catalog/book-card";
import { BookSearchFilters } from "@/components/catalog/book-search-filters";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookListParams } from "@/lib/api/types";

export default function BooksPage() {
  const t = useTranslations("catalog.pages");
  const [filters, setFilters] = React.useState<BookListParams>({});
  const { data, isPending, isError } = useBookList(filters);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("browseTitle")}</h1>
      <BookSearchFilters value={filters} onChange={setFilters} />
      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}
      {isError && <p className="text-destructive text-sm">{t("noBooksFound")}</p>}
      {data && data.items.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("noBooksFound")}</p>
      )}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement books/[id]/page.tsx**

```tsx
// app/(app)/books/[id]/page.tsx
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useBook, useBookReviews } from "@/hooks/useBooks";
import { ReleaseCard } from "@/components/catalog/release-card";
import { ReviewList } from "@/components/catalog/review-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalog.pages");
  const { data: book, isPending, isError } = useBook(id);
  const { data: reviewsPage, isLoading: reviewsLoading } = useBookReviews(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !book) {
    return <p className="text-muted-foreground">{t("bookNotFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{book.title}</h1>
        {book.description && <p className="text-muted-foreground">{book.description}</p>}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("releasesTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {book.releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("reviewsTitle")}</h2>
        <ReviewList reviews={reviewsPage?.items ?? []} isLoading={reviewsLoading} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Implement contributors/[id]/page.tsx**

```tsx
// app/(app)/contributors/[id]/page.tsx
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useContributor, useContributorBooks } from "@/hooks/useContributors";
import { BookCard } from "@/components/catalog/book-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContributorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalog.pages");
  const { data: contributor, isPending, isError } = useContributor(id);
  const { data: booksPage, isLoading: booksLoading } = useContributorBooks(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !contributor) {
    return <p className="text-muted-foreground">{t("contributorNotFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{contributor.full_name}</h1>
        {contributor.bio && <p className="text-muted-foreground">{contributor.bio}</p>}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("booksByContributor")}</h2>
        {booksLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(booksPage?.items ?? []).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Update header nav link**

In `components/shell/header.tsx`, change the "Browse" `<Link>` `href` from `"/"` to `"/books"`. Also update `components/shell/header.test.tsx` if it asserts the old href.

- [ ] **Step 6: Run typecheck, lint, tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 7: Run build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/books/ app/\(app\)/contributors/ components/shell/header.tsx components/shell/header.test.tsx messages/
git commit -m "feat(catalog): add public books list, book detail, contributor detail pages"
```

---

## Phase 5 — External Search + Admin Boundary + Admin Forms

### Task 16: proxy.ts admin gating + admin layout guard

**Files:**

- Modify: `proxy.ts`
- Create: `app/(app)/admin/catalog/layout.tsx`
- Modify: `proxy.test.ts` (check if it exists; if not, create it)

**Interfaces:**

- Consumes: `fetchProfile` from `lib/api/users.ts` (existing, Block 1).
- Produces: server-side admin redirect used by every admin page under `app/(app)/admin/catalog/**`.

- [ ] **Step 1: Check for an existing proxy test**

Run: `find . -maxdepth 1 -iname "proxy.test.ts"` — if it exists, read it first to match its exact mocking pattern before extending; if not, create fresh per Step 2.

- [ ] **Step 2: Extend proxy.ts**

Modify `proxy.ts`: add `/admin` to `PROTECTED_PATHS` and its matcher:

```ts
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/profile", "/admin"];

export function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Presence-only check for UX/redirect purposes — the API still validates
  // the token and returns 401 if it's invalid or expired. Admin-specific
  // authorization (is_admin) is checked server-side in
  // app/(app)/admin/catalog/layout.tsx, not here — the JWT carries no
  // admin claim yet (see bookworm-hole-api#144).
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};
```

- [ ] **Step 3: Write/extend proxy test**

If no test file existed, create `proxy.test.ts` following the same request-mocking approach used elsewhere in the repo (check `lib/auth/*.test.ts` for `NextRequest` construction patterns). Add cases: `/admin/catalog/books` without a token redirects to `/login?from=%2Fadmin%2Fcatalog%2Fbooks`; `/admin/catalog/books` with a token calls `NextResponse.next()`; `/books` (public) always calls `NextResponse.next()` regardless of token.

- [ ] **Step 4: Run proxy test**

Run: `pnpm test proxy`
Expected: PASS

- [ ] **Step 5: Implement admin layout guard**

```tsx
// app/(app)/admin/catalog/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { fetchProfile } from "@/lib/api/users";

export default async function AdminCatalogLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.get("access_token")?.value) {
    redirect("/login?from=/admin/catalog");
  }

  try {
    const profile = await fetchProfile();
    if (!profile.is_admin) {
      redirect("/");
    }
  } catch {
    redirect("/login?from=/admin/catalog");
  }

  return <div className="flex flex-col gap-6">{children}</div>;
}
```

Note: `fetchProfile()` uses the shared `apiClient` (`lib/api/client.ts`), which is browser-axios with a relative `/api` baseURL and cookie-based `withCredentials`. Server components run on the server, so this call needs the request's cookies forwarded explicitly. Check `lib/api/client.ts` and `lib/api/users.ts` — if `apiClient` doesn't already support server-side cookie forwarding (it won't, since `withCredentials` is a browser-fetch/XHR concept), add a server-only variant:

```ts
// lib/api/server-client.ts
import axios from "axios";
import { cookies } from "next/headers";

export async function serverApiClient() {
  const cookieStore = await cookies();
  return axios.create({
    baseURL: process.env.INTERNAL_API_BASE_URL ?? "http://localhost:3000/api",
    headers: { Cookie: cookieStore.toString() },
  });
}
```

Then use it in the layout instead of `fetchProfile()` directly:

```tsx
// app/(app)/admin/catalog/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverApiClient } from "@/lib/api/server-client";
import type { UserProfileResponse } from "@/lib/api/types";

export default async function AdminCatalogLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.get("access_token")?.value) {
    redirect("/login?from=/admin/catalog");
  }

  try {
    const client = await serverApiClient();
    const { data: profile } = await client.get<UserProfileResponse>("/users/me");
    if (!profile.is_admin) {
      redirect("/");
    }
  } catch {
    redirect("/login?from=/admin/catalog");
  }

  return <div className="flex flex-col gap-6">{children}</div>;
}
```

Before writing this file, read `app/api/**` (the BFF routes) to find the actual internal base URL / rewrite target used by `next.config.ts`'s `/api` rewrite, and use that exact value instead of guessing `http://localhost:3000/api` — check for an existing `API_BASE_URL` or similar env var already used server-side (search `process.env` usages in `app/api/`).

- [ ] **Step 6: Run typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add proxy.ts proxy.test.ts app/\(app\)/admin/catalog/layout.tsx lib/api/server-client.ts
git commit -m "feat(catalog): add admin route gating (proxy presence check + server-side is_admin layout guard)"
```

---

### Task 17: External search page + import dialog

**Files:**

- Create: `app/(app)/external/page.tsx`
- Create: `components/catalog/admin/import-book-dialog.tsx`
- Create: `components/catalog/admin/import-book-dialog.stories.tsx`
- Create: `components/catalog/admin/import-book-dialog.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.external` namespace)

**Interfaces:**

- Consumes: `useExternalSearch` (Task 9), `useImportBook` (Task 10), `useMe` (existing).
- Produces: `ImportBookDialog({ hit: ExternalSearchHit }): JSX.Element`.

- [ ] **Step 1: Add message keys**

`messages/en.json`:

```json
"external": {
  "title": "Search external sources",
  "searchPlaceholder": "Search by title, author, or ISBN",
  "noResults": "No results found.",
  "partialFailureNotice": "Some sources failed: {sources}",
  "import": "Import",
  "importing": "Importing...",
  "imported": "Imported successfully.",
  "notYetRated": "Not yet rated"
}
```

`messages/uk.json`:

```json
"external": {
  "title": "Пошук у зовнішніх джерелах",
  "searchPlaceholder": "Пошук за назвою, автором або ISBN",
  "noResults": "Результатів не знайдено.",
  "partialFailureNotice": "Деякі джерела недоступні: {sources}",
  "import": "Імпортувати",
  "importing": "Імпортування...",
  "imported": "Успішно імпортовано.",
  "notYetRated": "Ще немає оцінок"
}
```

- [ ] **Step 2: Write import-book-dialog test**

```tsx
// components/catalog/admin/import-book-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { ImportBookDialog } from "./import-book-dialog";
import enMessages from "@/messages/en.json";
import type { ExternalSearchHit } from "@/lib/api/types";

const server = setupServer(
  http.post("/api/external/import", () => {
    return HttpResponse.json({
      id: "imported-1",
      title: "Dune",
      releases: [],
      average_rating: null,
      rating_count: 0,
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const hit: ExternalSearchHit = {
  source: "google_books",
  title: "Dune",
  isbns: ["9780441013593"],
  authors: ["Frank Herbert"],
  cover_image_url: null,
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ImportBookDialog hit={hit} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ImportBookDialog", () => {
  it("imports the book on confirm", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(screen.getByText("Imported successfully.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Implement ImportBookDialog**

```tsx
// components/catalog/admin/import-book-dialog.tsx
"use client";

import { useTranslations } from "next-intl";
import { useImportBook } from "@/hooks/useImportBook";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ExternalSearchHit } from "@/lib/api/types";

export function ImportBookDialog({ hit }: { hit: ExternalSearchHit }) {
  const t = useTranslations("catalog.external");
  const importBook = useImportBook();

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>{t("import")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hit.title}</DialogTitle>
        </DialogHeader>
        {importBook.isSuccess && <p className="text-muted-foreground text-sm">{t("imported")}</p>}
        {importBook.isError && (
          <p className="text-destructive text-sm">{extractErrorMessage(importBook.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={importBook.isPending}
            onClick={() =>
              importBook.mutate({ source: hit.source, source_id: hit.isbns[0] ?? hit.title })
            }
          >
            {importBook.isPending ? t("importing") : t("import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test import-book-dialog`
Expected: PASS

- [ ] **Step 5: Write story**

```tsx
// components/catalog/admin/import-book-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImportBookDialog } from "./import-book-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ImportBookDialog> = {
  title: "Catalog/Admin/ImportBookDialog",
  component: ImportBookDialog,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Story />
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof ImportBookDialog> = {
  args: {
    hit: {
      source: "google_books",
      title: "Dune",
      isbns: ["9780441013593"],
      authors: ["Frank Herbert"],
      cover_image_url: null,
    },
  },
};
```

- [ ] **Step 6: Implement external/page.tsx**

```tsx
// app/(app)/external/page.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useExternalSearch } from "@/hooks/useExternalSearch";
import { useMe } from "@/hooks/useMe";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportBookDialog } from "@/components/catalog/admin/import-book-dialog";

export default function ExternalSearchPage() {
  const t = useTranslations("catalog.external");
  const [query, setQuery] = React.useState("");
  const { data: me } = useMe();
  const { data, isPending } = useExternalSearch(query);

  const failedSources = data ? Object.keys(data.partial_failures) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Input
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {failedSources.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {t("partialFailureNotice", { sources: failedSources.join(", ") })}
        </p>
      )}
      {!isPending && data && data.hits.length === 0 && query.trim() && (
        <p className="text-muted-foreground text-sm">{t("noResults")}</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.hits ?? []).map((hit, index) => (
          <Card key={`${hit.source}-${hit.isbns[0] ?? index}`}>
            <CardHeader>
              <CardTitle className="line-clamp-2 text-base">{hit.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-muted-foreground text-sm">{hit.authors.join(", ")}</p>
              {me?.is_admin && <ImportBookDialog hit={hit} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run typecheck, lint, tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/external/ components/catalog/admin/import-book-dialog.tsx components/catalog/admin/import-book-dialog.stories.tsx components/catalog/admin/import-book-dialog.test.tsx messages/
git commit -m "feat(catalog): add external search page and import dialog"
```

---

### Task 18: Admin BookForm + ReleaseForm components

**Files:**

- Create: `components/catalog/admin/book-form.tsx`
- Create: `components/catalog/admin/book-form.stories.tsx`
- Create: `components/catalog/admin/book-form.test.tsx`
- Create: `components/catalog/admin/release-form.tsx`
- Create: `components/catalog/admin/release-form.stories.tsx`
- Create: `components/catalog/admin/release-form.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalogAdmin.book`, `catalogAdmin.release` namespaces)

**Interfaces:**

- Consumes: `useCreateBook`, `useUpdateBook` (Task 10); `useCreateRelease`, `useUpdateRelease` (Task 10).
- Produces: `BookForm({ book?: BookResponse, onSuccess: (book: BookResponse) => void }): JSX.Element`; `ReleaseForm({ bookId: string, release?: ReleaseWithISBNsResponse, onSuccess: (release: ReleaseWithISBNsResponse) => void }): JSX.Element`.

- [ ] **Step 1: Add message keys**

`messages/en.json`, add top-level `catalogAdmin`:

```json
"catalogAdmin": {
  "book": {
    "titleLabel": "Title",
    "originalTitleLabel": "Original title",
    "originalLanguageLabel": "Original language",
    "firstPublicationYearLabel": "First publication year",
    "descriptionLabel": "Description",
    "createSubmit": "Create book",
    "creating": "Creating...",
    "editSubmit": "Save changes",
    "saving": "Saving..."
  },
  "release": {
    "formatLabel": "Format",
    "publisherLabel": "Publisher",
    "publishedYearLabel": "Published year",
    "languageLabel": "Language",
    "pageCountLabel": "Page count",
    "durationMinutesLabel": "Duration (minutes)",
    "coverImageUrlLabel": "Cover image URL",
    "createSubmit": "Create release",
    "creating": "Creating...",
    "editSubmit": "Save changes",
    "saving": "Saving..."
  }
}
```

`messages/uk.json`:

```json
"catalogAdmin": {
  "book": {
    "titleLabel": "Назва",
    "originalTitleLabel": "Оригінальна назва",
    "originalLanguageLabel": "Оригінальна мова",
    "firstPublicationYearLabel": "Рік першої публікації",
    "descriptionLabel": "Опис",
    "createSubmit": "Створити книгу",
    "creating": "Створення...",
    "editSubmit": "Зберегти зміни",
    "saving": "Збереження..."
  },
  "release": {
    "formatLabel": "Формат",
    "publisherLabel": "Видавець",
    "publishedYearLabel": "Рік видання",
    "languageLabel": "Мова",
    "pageCountLabel": "Кількість сторінок",
    "durationMinutesLabel": "Тривалість (хв)",
    "coverImageUrlLabel": "URL обкладинки",
    "createSubmit": "Створити видання",
    "creating": "Створення...",
    "editSubmit": "Зберегти зміни",
    "saving": "Збереження..."
  }
}
```

- [ ] **Step 2: Write book-form test**

```tsx
// components/catalog/admin/book-form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { BookForm } from "./book-form";
import enMessages from "@/messages/en.json";

const server = setupServer(
  http.post("/api/books", async ({ request }) => {
    const body = (await request.json()) as { title: string; description: string };
    return HttpResponse.json(
      { id: "new-book", title: body.title, description: body.description },
      { status: 201 },
    );
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <BookForm onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("BookForm", () => {
  it("creates a book on submit", async () => {
    const user = userEvent.setup();
    const onSuccess = renderForm();
    await user.type(screen.getByLabelText("Title"), "Dune");
    await user.type(screen.getByLabelText("Description"), "A sci-fi epic.");
    await user.click(screen.getByRole("button", { name: "Create book" }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("pre-fills fields when editing an existing book", () => {
    renderForm();
  });
});
```

- [ ] **Step 3: Implement BookForm**

```tsx
// components/catalog/admin/book-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateBook, useUpdateBook } from "@/hooks/useBookAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";
import type { BookResponse } from "@/lib/api/types";

export function BookForm({
  book,
  onSuccess,
}: {
  book?: BookResponse;
  onSuccess: (book: BookResponse) => void;
}) {
  const t = useTranslations("catalogAdmin.book");
  const [title, setTitle] = React.useState(book?.title ?? "");
  const [originalTitle, setOriginalTitle] = React.useState(book?.original_title ?? "");
  const [originalLanguage, setOriginalLanguage] = React.useState(book?.original_language ?? "");
  const [firstPublicationYear, setFirstPublicationYear] = React.useState(
    book?.first_publication_year?.toString() ?? "",
  );
  const [description, setDescription] = React.useState(book?.description ?? "");

  const createBook = useCreateBook();
  const updateBook = useUpdateBook(book?.id ?? "");
  const mutation = book ? updateBook : createBook;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      title,
      original_title: originalTitle || null,
      original_language: originalLanguage || null,
      first_publication_year: firstPublicationYear ? Number(firstPublicationYear) : null,
      description,
    };
    mutation.mutate(payload, { onSuccess: (result) => onSuccess(result) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-original-title" className="text-sm font-medium">
          {t("originalTitleLabel")}
        </label>
        <Input
          id="book-original-title"
          value={originalTitle}
          onChange={(e) => setOriginalTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-original-language" className="text-sm font-medium">
          {t("originalLanguageLabel")}
        </label>
        <Input
          id="book-original-language"
          value={originalLanguage}
          onChange={(e) => setOriginalLanguage(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-first-publication-year" className="text-sm font-medium">
          {t("firstPublicationYearLabel")}
        </label>
        <Input
          id="book-first-publication-year"
          type="number"
          value={firstPublicationYear}
          onChange={(e) => setFirstPublicationYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-description" className="text-sm font-medium">
          {t("descriptionLabel")}
        </label>
        <Textarea
          id="book-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      {mutation.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {book
          ? mutation.isPending
            ? t("saving")
            : t("editSubmit")
          : mutation.isPending
            ? t("creating")
            : t("createSubmit")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Run book-form test**

Run: `pnpm test book-form`
Expected: PASS

- [ ] **Step 5: Write book-form story**

```tsx
// components/catalog/admin/book-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookForm } from "./book-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof BookForm> = {
  title: "Catalog/Admin/BookForm",
  component: BookForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <div className="max-w-md">
            <Story />
          </div>
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Create: StoryObj<typeof BookForm> = { args: { onSuccess: () => {} } };

export const Edit: StoryObj<typeof BookForm> = {
  args: {
    book: {
      id: "b1",
      title: "Dune",
      original_title: null,
      original_language: null,
      first_publication_year: 1965,
      description: "A sci-fi epic.",
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
    onSuccess: () => {},
  },
};
```

- [ ] **Step 6: Write release-form test**

```tsx
// components/catalog/admin/release-form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { ReleaseForm } from "./release-form";
import enMessages from "@/messages/en.json";

const server = setupServer(
  http.post("/api/releases", async ({ request }) => {
    const body = (await request.json()) as { publisher: string };
    return HttpResponse.json(
      {
        id: "new-release",
        publisher: body.publisher,
        format: "hardcover",
        isbns: [],
        average_rating: null,
        rating_count: 0,
      },
      { status: 201 },
    );
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReleaseForm bookId="b1" onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("ReleaseForm", () => {
  it("creates a release on submit", async () => {
    const user = userEvent.setup();
    const onSuccess = renderForm();
    await user.type(screen.getByLabelText("Publisher"), "Ace Books");
    await user.type(screen.getByLabelText("Language"), "en");
    await user.click(screen.getByRole("button", { name: "Create release" }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
```

- [ ] **Step 7: Implement ReleaseForm**

```tsx
// components/catalog/admin/release-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateRelease, useUpdateRelease } from "@/hooks/useReleaseAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ReleaseFormat, ReleaseWithISBNsResponse } from "@/lib/api/types";

const FORMATS: ReleaseFormat[] = ["hardcover", "paperback", "ebook", "audiobook", "other"];

export function ReleaseForm({
  bookId,
  release,
  onSuccess,
}: {
  bookId: string;
  release?: ReleaseWithISBNsResponse;
  onSuccess: (release: ReleaseWithISBNsResponse) => void;
}) {
  const t = useTranslations("catalogAdmin.release");
  const [format, setFormat] = React.useState<ReleaseFormat>(release?.format ?? "paperback");
  const [publisher, setPublisher] = React.useState(release?.publisher ?? "");
  const [publishedYear, setPublishedYear] = React.useState(
    release?.published_year?.toString() ?? "",
  );
  const [language, setLanguage] = React.useState(release?.language ?? "");
  const [pageCount, setPageCount] = React.useState(release?.page_count?.toString() ?? "");
  const [durationMinutes, setDurationMinutes] = React.useState(
    release?.duration_minutes?.toString() ?? "",
  );
  const [coverImageUrl, setCoverImageUrl] = React.useState(release?.cover_image_url ?? "");

  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease(release?.id ?? "");
  const mutation = release ? updateRelease : createRelease;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const basePayload = {
      format,
      publisher,
      published_year: publishedYear ? Number(publishedYear) : null,
      language,
      page_count: pageCount ? Number(pageCount) : null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      cover_image_url: coverImageUrl || null,
    };
    if (release) {
      updateRelease.mutate(basePayload, { onSuccess: (result) => onSuccess(result) });
    } else {
      createRelease.mutate(
        { ...basePayload, book_id: bookId, description_override: null },
        {
          onSuccess: (result) => onSuccess(result),
        },
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-format" className="text-sm font-medium">
          {t("formatLabel")}
        </label>
        <Select value={format} onValueChange={(value) => setFormat(value as ReleaseFormat)}>
          <SelectTrigger id="release-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-publisher" className="text-sm font-medium">
          {t("publisherLabel")}
        </label>
        <Input
          id="release-publisher"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-published-year" className="text-sm font-medium">
          {t("publishedYearLabel")}
        </label>
        <Input
          id="release-published-year"
          type="number"
          value={publishedYear}
          onChange={(e) => setPublishedYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-language" className="text-sm font-medium">
          {t("languageLabel")}
        </label>
        <Input
          id="release-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-page-count" className="text-sm font-medium">
          {t("pageCountLabel")}
        </label>
        <Input
          id="release-page-count"
          type="number"
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-duration-minutes" className="text-sm font-medium">
          {t("durationMinutesLabel")}
        </label>
        <Input
          id="release-duration-minutes"
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-cover-image-url" className="text-sm font-medium">
          {t("coverImageUrlLabel")}
        </label>
        <Input
          id="release-cover-image-url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>
      {mutation.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {release
          ? mutation.isPending
            ? t("saving")
            : t("editSubmit")
          : mutation.isPending
            ? t("creating")
            : t("createSubmit")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 8: Run release-form test**

Run: `pnpm test release-form`
Expected: PASS

- [ ] **Step 9: Write release-form story**

```tsx
// components/catalog/admin/release-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReleaseForm } from "./release-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReleaseForm> = {
  title: "Catalog/Admin/ReleaseForm",
  component: ReleaseForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <div className="max-w-md">
            <Story />
          </div>
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Create: StoryObj<typeof ReleaseForm> = { args: { bookId: "b1", onSuccess: () => {} } };
```

- [ ] **Step 10: Run typecheck, lint, tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add components/catalog/admin/book-form.tsx components/catalog/admin/book-form.stories.tsx components/catalog/admin/book-form.test.tsx components/catalog/admin/release-form.tsx components/catalog/admin/release-form.stories.tsx components/catalog/admin/release-form.test.tsx messages/
git commit -m "feat(catalog): add admin BookForm and ReleaseForm components"
```

---

### Task 19: Admin ContributorForm, MergeBooksDialog, AttachContributorDialog

**Files:**

- Create: `components/catalog/admin/contributor-form.tsx`
- Create: `components/catalog/admin/contributor-form.stories.tsx`
- Create: `components/catalog/admin/contributor-form.test.tsx`
- Create: `components/catalog/admin/merge-books-dialog.tsx`
- Create: `components/catalog/admin/merge-books-dialog.stories.tsx`
- Create: `components/catalog/admin/merge-books-dialog.test.tsx`
- Create: `components/catalog/admin/attach-contributor-dialog.tsx`
- Create: `components/catalog/admin/attach-contributor-dialog.stories.tsx`
- Create: `components/catalog/admin/attach-contributor-dialog.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalogAdmin.contributor`, `catalogAdmin.merge`, `catalogAdmin.attachContributor` namespaces)

**Interfaces:**

- Consumes: `useCreateContributor`, `useUpdateContributor` (Task 10); `useMergeBooks` (Task 10); `useAddBookContributor` (Task 10), `useContributorList` (Task 9).
- Produces: `ContributorForm({ contributor?: ContributorResponse, onSuccess: (c: ContributorResponse) => void })`; `MergeBooksDialog({ sourceBookId: string, sourceBookTitle: string, onSuccess: () => void })`; `AttachContributorDialog({ bookId: string, onSuccess: () => void })`.

- [ ] **Step 1: Add message keys**

`messages/en.json` under `catalogAdmin`:

```json
"contributor": {
  "fullNameLabel": "Full name",
  "sortNameLabel": "Sort name",
  "birthYearLabel": "Birth year",
  "deathYearLabel": "Death year",
  "bioLabel": "Bio",
  "createSubmit": "Create contributor",
  "creating": "Creating...",
  "editSubmit": "Save changes",
  "saving": "Saving..."
},
"merge": {
  "trigger": "Merge into another book",
  "title": "Merge \"{title}\" into another book",
  "targetIdLabel": "Target book ID",
  "confirm": "Merge",
  "merging": "Merging...",
  "selfMergeError": "Cannot merge a book into itself."
},
"attachContributor": {
  "trigger": "Add contributor",
  "title": "Add contributor",
  "contributorLabel": "Contributor",
  "roleLabel": "Role",
  "confirm": "Add",
  "adding": "Adding...",
  "alreadyExisted": "This contributor already has this role on the book."
}
```

`messages/uk.json`:

```json
"contributor": {
  "fullNameLabel": "Повне ім'я",
  "sortNameLabel": "Ім'я для сортування",
  "birthYearLabel": "Рік народження",
  "deathYearLabel": "Рік смерті",
  "bioLabel": "Біографія",
  "createSubmit": "Створити автора",
  "creating": "Створення...",
  "editSubmit": "Зберегти зміни",
  "saving": "Збереження..."
},
"merge": {
  "trigger": "Об'єднати з іншою книгою",
  "title": "Об'єднати \"{title}\" з іншою книгою",
  "targetIdLabel": "ID цільової книги",
  "confirm": "Об'єднати",
  "merging": "Об'єднання...",
  "selfMergeError": "Неможливо об'єднати книгу саму з собою."
},
"attachContributor": {
  "trigger": "Додати автора",
  "title": "Додати автора",
  "contributorLabel": "Автор",
  "roleLabel": "Роль",
  "confirm": "Додати",
  "adding": "Додавання...",
  "alreadyExisted": "Цей автор вже має цю роль у книзі."
}
```

- [ ] **Step 2: Write contributor-form test**

```tsx
// components/catalog/admin/contributor-form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { ContributorForm } from "./contributor-form";
import enMessages from "@/messages/en.json";

const server = setupServer(
  http.post("/api/contributors", async ({ request }) => {
    const body = (await request.json()) as { full_name: string };
    return HttpResponse.json(
      { id: "new-c", full_name: body.full_name, sort_name: body.full_name, slug: "x" },
      { status: 201 },
    );
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ContributorForm onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("ContributorForm", () => {
  it("creates a contributor on submit", async () => {
    const user = userEvent.setup();
    const onSuccess = renderForm();
    await user.type(screen.getByLabelText("Full name"), "Frank Herbert");
    await user.type(screen.getByLabelText("Sort name"), "Herbert, Frank");
    await user.click(screen.getByRole("button", { name: "Create contributor" }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
```

- [ ] **Step 3: Implement ContributorForm**

```tsx
// components/catalog/admin/contributor-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateContributor, useUpdateContributor } from "@/hooks/useContributorAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ContributorResponse } from "@/lib/api/types";

export function ContributorForm({
  contributor,
  onSuccess,
}: {
  contributor?: ContributorResponse;
  onSuccess: (contributor: ContributorResponse) => void;
}) {
  const t = useTranslations("catalogAdmin.contributor");
  const [fullName, setFullName] = React.useState(contributor?.full_name ?? "");
  const [sortName, setSortName] = React.useState(contributor?.sort_name ?? "");
  const [birthYear, setBirthYear] = React.useState(contributor?.birth_year?.toString() ?? "");
  const [deathYear, setDeathYear] = React.useState(contributor?.death_year?.toString() ?? "");
  const [bio, setBio] = React.useState(contributor?.bio ?? "");

  const createContributor = useCreateContributor();
  const updateContributor = useUpdateContributor(contributor?.id ?? "");
  const mutation = contributor ? updateContributor : createContributor;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        full_name: fullName,
        sort_name: sortName,
        birth_year: birthYear ? Number(birthYear) : null,
        death_year: deathYear ? Number(deathYear) : null,
        bio: bio || null,
      },
      { onSuccess: (result) => onSuccess(result) },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-full-name" className="text-sm font-medium">
          {t("fullNameLabel")}
        </label>
        <Input
          id="contributor-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-sort-name" className="text-sm font-medium">
          {t("sortNameLabel")}
        </label>
        <Input
          id="contributor-sort-name"
          value={sortName}
          onChange={(e) => setSortName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-birth-year" className="text-sm font-medium">
          {t("birthYearLabel")}
        </label>
        <Input
          id="contributor-birth-year"
          type="number"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-death-year" className="text-sm font-medium">
          {t("deathYearLabel")}
        </label>
        <Input
          id="contributor-death-year"
          type="number"
          value={deathYear}
          onChange={(e) => setDeathYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contributor-bio" className="text-sm font-medium">
          {t("bioLabel")}
        </label>
        <Textarea id="contributor-bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      {mutation.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {contributor
          ? mutation.isPending
            ? t("saving")
            : t("editSubmit")
          : mutation.isPending
            ? t("creating")
            : t("createSubmit")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Run contributor-form test**

Run: `pnpm test contributor-form`
Expected: PASS

- [ ] **Step 5: Write contributor-form story**

```tsx
// components/catalog/admin/contributor-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContributorForm } from "./contributor-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ContributorForm> = {
  title: "Catalog/Admin/ContributorForm",
  component: ContributorForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <div className="max-w-md">
            <Story />
          </div>
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Create: StoryObj<typeof ContributorForm> = { args: { onSuccess: () => {} } };
```

- [ ] **Step 6: Write merge-books-dialog test**

```tsx
// components/catalog/admin/merge-books-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { MergeBooksDialog } from "./merge-books-dialog";
import enMessages from "@/messages/en.json";

const server = setupServer(
  http.post("/api/books/:sourceId/merge-into/:targetId", ({ params }) => {
    if (params.sourceId === params.targetId) {
      return HttpResponse.json({ detail: "Cannot merge a book into itself" }, { status: 409 });
    }
    return HttpResponse.json({ id: params.targetId, title: "Merged", releases: [] });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <MergeBooksDialog sourceBookId="b1" sourceBookTitle="Dune" onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("MergeBooksDialog", () => {
  it("merges into a different target book", async () => {
    const user = userEvent.setup();
    const onSuccess = renderDialog();
    await user.click(screen.getByRole("button", { name: "Merge into another book" }));
    await user.type(screen.getByLabelText("Target book ID"), "b2");
    await user.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows an error when merging into itself", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Merge into another book" }));
    await user.type(screen.getByLabelText("Target book ID"), "b1");
    await user.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() =>
      expect(screen.getByText("Cannot merge a book into itself")).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 7: Implement MergeBooksDialog**

```tsx
// components/catalog/admin/merge-books-dialog.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMergeBooks } from "@/hooks/useBookAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function MergeBooksDialog({
  sourceBookId,
  sourceBookTitle,
  onSuccess,
}: {
  sourceBookId: string;
  sourceBookTitle: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("catalogAdmin.merge");
  const [targetId, setTargetId] = React.useState("");
  const mergeBooks = useMergeBooks();

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { title: sourceBookTitle })}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="merge-target-id" className="text-sm font-medium">
            {t("targetIdLabel")}
          </label>
          <Input
            id="merge-target-id"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
        </div>
        {mergeBooks.isError && (
          <p className="text-destructive text-sm">{extractErrorMessage(mergeBooks.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={mergeBooks.isPending || !targetId}
            onClick={() =>
              mergeBooks.mutate(
                { sourceId: sourceBookId, targetId },
                { onSuccess: () => onSuccess() },
              )
            }
          >
            {mergeBooks.isPending ? t("merging") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8: Run merge-books-dialog test**

Run: `pnpm test merge-books-dialog`
Expected: PASS

- [ ] **Step 9: Write merge-books-dialog story**

```tsx
// components/catalog/admin/merge-books-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MergeBooksDialog } from "./merge-books-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof MergeBooksDialog> = {
  title: "Catalog/Admin/MergeBooksDialog",
  component: MergeBooksDialog,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Story />
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof MergeBooksDialog> = {
  args: { sourceBookId: "b1", sourceBookTitle: "Dune", onSuccess: () => {} },
};
```

- [ ] **Step 10: Write attach-contributor-dialog test**

```tsx
// components/catalog/admin/attach-contributor-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { AttachContributorDialog } from "./attach-contributor-dialog";
import enMessages from "@/messages/en.json";

const server = setupServer(
  http.get("/api/contributors", () => {
    return HttpResponse.json({
      items: [
        {
          id: "c1",
          full_name: "Frank Herbert",
          sort_name: "Herbert, Frank",
          slug: "frank-herbert",
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });
  }),
  http.post("/api/books/:bookId/contributors", () => {
    return HttpResponse.json({ status: "created" });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AttachContributorDialog bookId="b1" onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("AttachContributorDialog", () => {
  it("attaches a contributor with a role", async () => {
    const user = userEvent.setup();
    const onSuccess = renderDialog();
    await user.click(screen.getByRole("button", { name: "Add contributor" }));
    await waitFor(() => expect(screen.getByText("Frank Herbert")).toBeInTheDocument());
  });
});
```

- [ ] **Step 11: Implement AttachContributorDialog**

```tsx
// components/catalog/admin/attach-contributor-dialog.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useContributorList } from "@/hooks/useContributors";
import { useAddBookContributor } from "@/hooks/useBookAdmin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ContributorRole } from "@/lib/api/types";

const ROLES: ContributorRole[] = [
  "author",
  "co_author",
  "translator",
  "illustrator",
  "editor",
  "narrator",
  "foreword",
  "other",
];

export function AttachContributorDialog({
  bookId,
  onSuccess,
}: {
  bookId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("catalogAdmin.attachContributor");
  const [contributorId, setContributorId] = React.useState("");
  const [role, setRole] = React.useState<ContributorRole>("author");
  const { data: contributorsPage } = useContributorList({ limit: 50 });
  const addContributor = useAddBookContributor(bookId);

  const alreadyExisted = addContributor.data?.status === "already_existed";

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="attach-contributor-select" className="text-sm font-medium">
            {t("contributorLabel")}
          </label>
          <Select value={contributorId} onValueChange={setContributorId}>
            <SelectTrigger id="attach-contributor-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(contributorsPage?.items ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="attach-contributor-role" className="text-sm font-medium">
            {t("roleLabel")}
          </label>
          <Select value={role} onValueChange={(value) => setRole(value as ContributorRole)}>
            <SelectTrigger id="attach-contributor-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {alreadyExisted && <p className="text-muted-foreground text-sm">{t("alreadyExisted")}</p>}
        {addContributor.isError && (
          <p className="text-destructive text-sm">{extractErrorMessage(addContributor.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={addContributor.isPending || !contributorId}
            onClick={() =>
              addContributor.mutate(
                { contributor_id: contributorId, role },
                { onSuccess: () => onSuccess() },
              )
            }
          >
            {addContributor.isPending ? t("adding") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 12: Run attach-contributor-dialog test**

Run: `pnpm test attach-contributor-dialog`
Expected: PASS

- [ ] **Step 13: Write attach-contributor-dialog story**

```tsx
// components/catalog/admin/attach-contributor-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AttachContributorDialog } from "./attach-contributor-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof AttachContributorDialog> = {
  title: "Catalog/Admin/AttachContributorDialog",
  component: AttachContributorDialog,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Story />
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof AttachContributorDialog> = {
  args: { bookId: "b1", onSuccess: () => {} },
};
```

- [ ] **Step 14: Run typecheck, lint, tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 15: Commit**

```bash
git add components/catalog/admin/contributor-form.tsx components/catalog/admin/contributor-form.stories.tsx components/catalog/admin/contributor-form.test.tsx components/catalog/admin/merge-books-dialog.tsx components/catalog/admin/merge-books-dialog.stories.tsx components/catalog/admin/merge-books-dialog.test.tsx components/catalog/admin/attach-contributor-dialog.tsx components/catalog/admin/attach-contributor-dialog.stories.tsx components/catalog/admin/attach-contributor-dialog.test.tsx messages/
git commit -m "feat(catalog): add admin ContributorForm, MergeBooksDialog, AttachContributorDialog"
```

---

## Phase 6 — Admin Pages + Version History/Diff Viewer

### Task 20: Admin books list/create page + book edit page

**Files:**

- Create: `app/(app)/admin/catalog/books/page.tsx`
- Create: `app/(app)/admin/catalog/books/[id]/edit/page.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalogAdmin.pages` namespace)

**Interfaces:**

- Consumes: `useBookList` (Task 9), `useBook`, `BookForm`, `MergeBooksDialog`, `AttachContributorDialog`, `ReleaseForm` (Tasks 18-19), `useDeleteBook` (Task 10).

- [ ] **Step 1: Add message keys**

`messages/en.json` under `catalogAdmin`:

```json
"pages": {
  "manageBooks": "Manage books",
  "newBook": "New book",
  "editBook": "Edit book",
  "deleteBook": "Delete",
  "confirmDelete": "Delete this book permanently?",
  "addRelease": "Add edition",
  "backToList": "Back to list"
}
```

`messages/uk.json`:

```json
"pages": {
  "manageBooks": "Керування книгами",
  "newBook": "Нова книга",
  "editBook": "Редагувати книгу",
  "deleteBook": "Видалити",
  "confirmDelete": "Видалити цю книгу назавжди?",
  "addRelease": "Додати видання",
  "backToList": "Назад до списку"
}
```

- [ ] **Step 2: Implement admin/catalog/books/page.tsx**

```tsx
// app/(app)/admin/catalog/books/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useBookList } from "@/hooks/useBooks";
import { useDeleteBook } from "@/hooks/useBookAdmin";
import { BookForm } from "@/components/catalog/admin/book-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminBooksPage() {
  const t = useTranslations("catalogAdmin.pages");
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isPending } = useBookList({ limit: 50 });
  const deleteBook = useDeleteBook();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("manageBooks")}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>{t("newBook")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("newBook")}</DialogTitle>
            </DialogHeader>
            <BookForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {!isPending && (
        <div className="flex flex-col gap-3">
          {(data?.items ?? []).map((book) => (
            <Card key={book.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{book.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/admin/catalog/books/${book.id}/edit`} />}
                  >
                    {t("editBook")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(t("confirmDelete"))) {
                        deleteBook.mutate(book.id);
                      }
                    }}
                  >
                    {t("deleteBook")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement admin/catalog/books/[id]/edit/page.tsx**

```tsx
// app/(app)/admin/catalog/books/[id]/edit/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useBook } from "@/hooks/useBooks";
import { BookForm } from "@/components/catalog/admin/book-form";
import { ReleaseForm } from "@/components/catalog/admin/release-form";
import { MergeBooksDialog } from "@/components/catalog/admin/merge-books-dialog";
import { AttachContributorDialog } from "@/components/catalog/admin/attach-contributor-dialog";
import { ReleaseCard } from "@/components/catalog/release-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminBookEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalogAdmin.pages");
  const [addReleaseOpen, setAddReleaseOpen] = useState(false);
  const { data: book, isPending, isError, refetch } = useBook(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !book) {
    return <p className="text-muted-foreground">Book not found.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("editBook")}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" render={<Link href="/admin/catalog/books" />}>
            {t("backToList")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/catalog/books/${id}/history`} />}
          >
            History
          </Button>
        </div>
      </div>
      <BookForm book={book} onSuccess={() => refetch()} />
      <div className="flex items-center gap-2">
        <MergeBooksDialog
          sourceBookId={book.id}
          sourceBookTitle={book.title}
          onSuccess={() => refetch()}
        />
        <AttachContributorDialog bookId={book.id} onSuccess={() => refetch()} />
      </div>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Editions</h2>
          <Dialog open={addReleaseOpen} onOpenChange={setAddReleaseOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              {t("addRelease")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addRelease")}</DialogTitle>
              </DialogHeader>
              <ReleaseForm
                bookId={book.id}
                onSuccess={() => {
                  setAddReleaseOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {book.releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck, lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/admin/catalog/books/ messages/
git commit -m "feat(catalog): add admin books list/create and book edit pages"
```

---

### Task 21: Admin contributors page + release edit page

**Files:**

- Create: `app/(app)/admin/catalog/contributors/page.tsx`
- Create: `app/(app)/admin/catalog/contributors/[id]/edit/page.tsx`
- Create: `app/(app)/admin/catalog/releases/[id]/edit/page.tsx`

**Interfaces:**

- Consumes: `useContributorList`, `useContributor` (Task 9), `ContributorForm` (Task 19), `useRelease` (Task 9), `ReleaseForm` (Task 18).

- [ ] **Step 1: Implement admin/catalog/contributors/page.tsx**

```tsx
// app/(app)/admin/catalog/contributors/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useContributorList } from "@/hooks/useContributors";
import { ContributorForm } from "@/components/catalog/admin/contributor-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminContributorsPage() {
  const t = useTranslations("catalogAdmin.pages");
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isPending } = useContributorList({ limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage contributors</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>New contributor</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New contributor</DialogTitle>
            </DialogHeader>
            <ContributorForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {!isPending && (
        <div className="flex flex-col gap-3">
          {(data?.items ?? []).map((contributor) => (
            <Card key={contributor.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{contributor.full_name}</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/admin/catalog/contributors/${contributor.id}/edit`} />}
                >
                  {t("editBook")}
                </Button>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: reuses `catalogAdmin.pages.editBook` label ("Edit") for the contributor edit button since it's generic ("Edit"), not book-specific wording — acceptable reuse, avoids a near-duplicate key. If this reads oddly during review, rename the message key from `editBook` to `edit` and update both usages (Task 20 and this task) — either is fine, pick one and keep it consistent.

- [ ] **Step 2: Implement admin/catalog/contributors/[id]/edit/page.tsx**

```tsx
// app/(app)/admin/catalog/contributors/[id]/edit/page.tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useContributor } from "@/hooks/useContributors";
import { ContributorForm } from "@/components/catalog/admin/contributor-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminContributorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalogAdmin.pages");
  const { data: contributor, isPending, isError, refetch } = useContributor(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !contributor) {
    return <p className="text-muted-foreground">Contributor not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit contributor</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" render={<Link href="/admin/catalog/contributors" />}>
            {t("backToList")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/catalog/contributors/${id}/history`} />}
          >
            History
          </Button>
        </div>
      </div>
      <ContributorForm contributor={contributor} onSuccess={() => refetch()} />
    </div>
  );
}
```

- [ ] **Step 3: Implement admin/catalog/releases/[id]/edit/page.tsx**

```tsx
// app/(app)/admin/catalog/releases/[id]/edit/page.tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRelease } from "@/hooks/useReleases";
import { ReleaseForm } from "@/components/catalog/admin/release-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminReleaseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalogAdmin.pages");
  const { data: release, isPending, isError, refetch } = useRelease(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !release) {
    return <p className="text-muted-foreground">Release not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit release</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/catalog/releases/${id}/history`} />}
          >
            History
          </Button>
        </div>
      </div>
      <ReleaseForm bookId="" release={release} onSuccess={() => refetch()} />
    </div>
  );
}
```

Note: `ReleaseForm`'s `bookId` prop is only read on the create path (`createRelease.mutate({ ...basePayload, book_id: bookId, ... })` in Task 18); the edit path calls `updateRelease.mutate(basePayload)` which never touches `bookId`. Passing `""` here is safe since `release` is always provided on this page — verify this by reading `components/catalog/admin/release-form.tsx` before wiring, and if `bookId` is used unconditionally anywhere in that file, adjust to make it optional (`bookId?: string`) instead of passing a dummy value.

- [ ] **Step 4: Run typecheck, lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/admin/catalog/contributors/ app/\(app\)/admin/catalog/releases/
git commit -m "feat(catalog): add admin contributors page and release edit page"
```

---

### Task 22: VersionList and VersionDiffViewer components

**Files:**

- Create: `components/catalog/history/version-list.tsx`
- Create: `components/catalog/history/version-list.stories.tsx`
- Create: `components/catalog/history/version-list.test.tsx`
- Create: `components/catalog/history/version-diff-viewer.tsx`
- Create: `components/catalog/history/version-diff-viewer.stories.tsx`
- Create: `components/catalog/history/version-diff-viewer.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `history` namespace)

**Interfaces:**

- Consumes: `EntityVersionResponse`, `EntityVersionDetailResponse` types (Task 5).
- Produces: `VersionList({ versions: EntityVersionResponse[], selectedVersion?: number, onSelect: (version: number) => void }): JSX.Element`; `VersionDiffViewer({ before?: EntityVersionDetailResponse, after: EntityVersionDetailResponse }): JSX.Element`.

- [ ] **Step 1: Add message keys**

`messages/en.json`, add top-level `history`:

```json
"history": {
  "versionLabel": "Version {version}",
  "changeSource": {
    "admin": "Admin edit",
    "contribution": "User contribution",
    "external_sync": "External sync",
    "system": "System"
  },
  "empty": "No version history yet.",
  "fieldAdded": "added",
  "fieldChanged": "changed",
  "fieldRemoved": "removed",
  "noDiff": "No differences between these versions."
}
```

`messages/uk.json`:

```json
"history": {
  "versionLabel": "Версія {version}",
  "changeSource": {
    "admin": "Редагування адміном",
    "contribution": "Внесок користувача",
    "external_sync": "Зовнішня синхронізація",
    "system": "Система"
  },
  "empty": "Історія версій відсутня.",
  "fieldAdded": "додано",
  "fieldChanged": "змінено",
  "fieldRemoved": "видалено",
  "noDiff": "Немає відмінностей між цими версіями."
}
```

- [ ] **Step 2: Write version-list test**

```tsx
// components/catalog/history/version-list.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { VersionList } from "./version-list";
import enMessages from "@/messages/en.json";
import type { EntityVersionResponse } from "@/lib/api/types";

const versions: EntityVersionResponse[] = [
  {
    id: "v2",
    entity_type: "book",
    entity_id: "b1",
    version_number: 2,
    changed_by_user_id: "u1",
    change_source: "admin",
    contribution_id: null,
    created_at: "2020-02-01T00:00:00Z",
  },
  {
    id: "v1",
    entity_type: "book",
    entity_id: "b1",
    version_number: 1,
    changed_by_user_id: null,
    change_source: "system",
    contribution_id: null,
    created_at: "2020-01-01T00:00:00Z",
  },
];

describe("VersionList", () => {
  it("renders each version with its change source", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionList versions={versions} onSelect={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Version 2")).toBeInTheDocument();
    expect(screen.getByText("Admin edit")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("calls onSelect when a version is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionList versions={versions} onSelect={onSelect} />
      </NextIntlClientProvider>,
    );
    await user.click(screen.getByText("Version 2"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("shows an empty state with no versions", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionList versions={[]} onSelect={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No version history yet.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement VersionList**

```tsx
// components/catalog/history/version-list.tsx
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ChangeSource, EntityVersionResponse } from "@/lib/api/types";

export function VersionList({
  versions,
  selectedVersion,
  onSelect,
}: {
  versions: EntityVersionResponse[];
  selectedVersion?: number;
  onSelect: (version: number) => void;
}) {
  const t = useTranslations("history");

  if (versions.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {versions.map((version) => (
        <li key={version.id}>
          <Button
            variant={version.version_number === selectedVersion ? "secondary" : "ghost"}
            className="w-full justify-between"
            onClick={() => onSelect(version.version_number)}
          >
            <span>{t("versionLabel", { version: version.version_number })}</span>
            <span className="text-muted-foreground text-xs">
              {t(`changeSource.${version.change_source as ChangeSource}`)}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run version-list test**

Run: `pnpm test version-list`
Expected: PASS

- [ ] **Step 5: Write version-list story**

```tsx
// components/catalog/history/version-list.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { VersionList } from "./version-list";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof VersionList> = {
  title: "Catalog/History/VersionList",
  component: VersionList,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-sm">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const versions = [
  {
    id: "v2",
    entity_type: "book" as const,
    entity_id: "b1",
    version_number: 2,
    changed_by_user_id: "u1",
    change_source: "admin" as const,
    contribution_id: null,
    created_at: "2020-02-01T00:00:00Z",
  },
  {
    id: "v1",
    entity_type: "book" as const,
    entity_id: "b1",
    version_number: 1,
    changed_by_user_id: null,
    change_source: "system" as const,
    contribution_id: null,
    created_at: "2020-01-01T00:00:00Z",
  },
];

export const Default: StoryObj<typeof VersionList> = { args: { versions, onSelect: () => {} } };
export const Empty: StoryObj<typeof VersionList> = { args: { versions: [], onSelect: () => {} } };
```

- [ ] **Step 6: Write version-diff-viewer test**

```tsx
// components/catalog/history/version-diff-viewer.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { VersionDiffViewer } from "./version-diff-viewer";
import enMessages from "@/messages/en.json";
import type { EntityVersionDetailResponse } from "@/lib/api/types";

const before: EntityVersionDetailResponse = {
  id: "v1",
  entity_type: "book",
  entity_id: "b1",
  version_number: 1,
  changed_by_user_id: null,
  change_source: "system",
  contribution_id: null,
  created_at: "2020-01-01T00:00:00Z",
  snapshot: { title: "Dune", description: "Old description" },
};

const after: EntityVersionDetailResponse = {
  ...before,
  id: "v2",
  version_number: 2,
  snapshot: { title: "Dune", description: "New description", first_publication_year: 1965 },
};

describe("VersionDiffViewer", () => {
  it("shows changed fields", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("Old description")).toBeInTheDocument();
    expect(screen.getByText("New description")).toBeInTheDocument();
  });

  it("shows added fields", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("first_publication_year")).toBeInTheDocument();
  });

  it("does not show unchanged fields", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText(/^title$/)).not.toBeInTheDocument();
  });

  it("shows a no-diff message when identical", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer before={before} after={before} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No differences between these versions.")).toBeInTheDocument();
  });

  it("treats all fields as added when there is no before version", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VersionDiffViewer after={after} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("title")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Implement VersionDiffViewer**

```tsx
// components/catalog/history/version-diff-viewer.tsx
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { EntityVersionDetailResponse } from "@/lib/api/types";

type DiffKind = "added" | "changed" | "removed";

interface DiffRow {
  key: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
}

function computeDiff(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): DiffRow[] {
  const beforeSnapshot = before ?? {};
  const keys = new Set([...Object.keys(beforeSnapshot), ...Object.keys(after)]);
  const rows: DiffRow[] = [];

  for (const key of keys) {
    const beforeValue = beforeSnapshot[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }
    let kind: DiffKind = "changed";
    if (!(key in beforeSnapshot)) kind = "added";
    else if (!(key in after)) kind = "removed";
    rows.push({ key, kind, before: beforeValue, after: afterValue });
  }

  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function VersionDiffViewer({
  before,
  after,
}: {
  before?: EntityVersionDetailResponse;
  after: EntityVersionDetailResponse;
}) {
  const t = useTranslations("history");
  const rows = computeDiff(before?.snapshot, after.snapshot);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noDiff")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className="border-border flex flex-col gap-1 border-b pb-3 last:border-b-0"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">{row.key}</span>
            <Badge variant="outline">
              {t(`field${row.kind[0].toUpperCase()}${row.kind.slice(1)}`)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-destructive line-through">{formatValue(row.before)}</p>
            <p className="text-foreground">{formatValue(row.after)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Run version-diff-viewer test**

Run: `pnpm test version-diff-viewer`
Expected: PASS

- [ ] **Step 9: Write version-diff-viewer story**

```tsx
// components/catalog/history/version-diff-viewer.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { VersionDiffViewer } from "./version-diff-viewer";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof VersionDiffViewer> = {
  title: "Catalog/History/VersionDiffViewer",
  component: VersionDiffViewer,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-lg">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const before = {
  id: "v1",
  entity_type: "book" as const,
  entity_id: "b1",
  version_number: 1,
  changed_by_user_id: null,
  change_source: "system" as const,
  contribution_id: null,
  created_at: "2020-01-01T00:00:00Z",
  snapshot: { title: "Dune", description: "Old description" },
};

const after = {
  ...before,
  id: "v2",
  version_number: 2,
  snapshot: { title: "Dune", description: "New description", first_publication_year: 1965 },
};

export const WithChanges: StoryObj<typeof VersionDiffViewer> = { args: { before, after } };
export const NoBefore: StoryObj<typeof VersionDiffViewer> = { args: { after } };
export const NoDiff: StoryObj<typeof VersionDiffViewer> = { args: { before, after: before } };
```

- [ ] **Step 10: Run typecheck, lint, tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add components/catalog/history/ messages/
git commit -m "feat(catalog): add VersionList and VersionDiffViewer components"
```

---

### Task 23: Admin history pages (book, release, contributor)

**Files:**

- Create: `app/(app)/admin/catalog/books/[id]/history/page.tsx`
- Create: `app/(app)/admin/catalog/releases/[id]/history/page.tsx`
- Create: `app/(app)/admin/catalog/contributors/[id]/history/page.tsx`

**Interfaces:**

- Consumes: `useBookHistory`, `useBookVersion` (Task 9); `useReleaseHistory`, `useReleaseVersion`; `useContributorHistory`, `useContributorVersion`; `VersionList`, `VersionDiffViewer` (Task 22).

- [ ] **Step 1: Implement book history page**

```tsx
// app/(app)/admin/catalog/books/[id]/history/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useBookHistory, useBookVersion } from "@/hooks/useBooks";
import { VersionList } from "@/components/catalog/history/version-list";
import { VersionDiffViewer } from "@/components/catalog/history/version-diff-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBookHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: historyPage, isPending } = useBookHistory(id, { limit: 50 });
  const versions = historyPage?.items ?? [];
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const selectedIndex = versions.findIndex((v) => v.version_number === selected);
  const previousVersionNumber =
    selectedIndex >= 0 && selectedIndex + 1 < versions.length
      ? versions[selectedIndex + 1].version_number
      : undefined;

  const { data: afterVersion } = useBookVersion(id, selected);
  const { data: beforeVersion } = useBookVersion(id, previousVersionNumber);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Book history</h1>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/admin/catalog/books/${id}/edit`} />}
        >
          Back to edit
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <VersionList versions={versions} selectedVersion={selected} onSelect={setSelected} />
        )}
        {afterVersion && <VersionDiffViewer before={beforeVersion} after={afterVersion} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement release history page**

Same structure as Step 1, swap `useBookHistory`/`useBookVersion` for `useReleaseHistory`/`useReleaseVersion` from `@/hooks/useReleases`, and the back-link target for `/admin/catalog/releases/${id}/edit`, title "Release history".

```tsx
// app/(app)/admin/catalog/releases/[id]/history/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useReleaseHistory, useReleaseVersion } from "@/hooks/useReleases";
import { VersionList } from "@/components/catalog/history/version-list";
import { VersionDiffViewer } from "@/components/catalog/history/version-diff-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminReleaseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: historyPage, isPending } = useReleaseHistory(id, { limit: 50 });
  const versions = historyPage?.items ?? [];
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const selectedIndex = versions.findIndex((v) => v.version_number === selected);
  const previousVersionNumber =
    selectedIndex >= 0 && selectedIndex + 1 < versions.length
      ? versions[selectedIndex + 1].version_number
      : undefined;

  const { data: afterVersion } = useReleaseVersion(id, selected);
  const { data: beforeVersion } = useReleaseVersion(id, previousVersionNumber);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Release history</h1>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/admin/catalog/releases/${id}/edit`} />}
        >
          Back to edit
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <VersionList versions={versions} selectedVersion={selected} onSelect={setSelected} />
        )}
        {afterVersion && <VersionDiffViewer before={beforeVersion} after={afterVersion} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement contributor history page**

Same structure, `useContributorHistory`/`useContributorVersion` from `@/hooks/useContributors`, back-link `/admin/catalog/contributors/${id}/edit`, title "Contributor history".

```tsx
// app/(app)/admin/catalog/contributors/[id]/history/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useContributorHistory, useContributorVersion } from "@/hooks/useContributors";
import { VersionList } from "@/components/catalog/history/version-list";
import { VersionDiffViewer } from "@/components/catalog/history/version-diff-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminContributorHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: historyPage, isPending } = useContributorHistory(id, { limit: 50 });
  const versions = historyPage?.items ?? [];
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const selectedIndex = versions.findIndex((v) => v.version_number === selected);
  const previousVersionNumber =
    selectedIndex >= 0 && selectedIndex + 1 < versions.length
      ? versions[selectedIndex + 1].version_number
      : undefined;

  const { data: afterVersion } = useContributorVersion(id, selected);
  const { data: beforeVersion } = useContributorVersion(id, previousVersionNumber);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contributor history</h1>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/admin/catalog/contributors/${id}/edit`} />}
        >
          Back to edit
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <VersionList versions={versions} selectedVersion={selected} onSelect={setSelected} />
        )}
        {afterVersion && <VersionDiffViewer before={beforeVersion} after={afterVersion} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck, lint, build**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/admin/catalog/books/\[id\]/history/ app/\(app\)/admin/catalog/releases/\[id\]/history/ app/\(app\)/admin/catalog/contributors/\[id\]/history/
git commit -m "feat(catalog): add admin version history pages for books/releases/contributors"
```

---

## Phase 7 — Tests, Polish, Final Gate

### Task 24: Playwright e2e happy path — browse and view a book

**Files:**

- Create: `e2e/catalog-browse.spec.ts`

**Interfaces:**

- Consumes: existing Playwright setup (check `e2e/` directory for the auth happy-path spec from Block 1 to match its config/fixture pattern before writing this).

- [ ] **Step 1: Read the existing e2e spec for setup pattern**

Read the Block 1 Playwright spec (search `e2e/*.spec.ts`) in full to copy its `test.describe`/`page.goto`/base URL conventions exactly.

- [ ] **Step 2: Write the catalog browse e2e spec**

```ts
// e2e/catalog-browse.spec.ts
import { test, expect } from "@playwright/test";

test.describe("catalog browse", () => {
  test("visitor can browse books and open a detail page", async ({ page }) => {
    await page.goto("/books");
    await expect(page.getByRole("heading", { name: /browse books/i })).toBeVisible();

    const firstBookLink = page.locator('a[href^="/books/"]').first();
    await expect(firstBookLink).toBeVisible();
    const bookTitle = await firstBookLink.innerText();
    await firstBookLink.click();

    await expect(page.getByRole("heading", { name: bookTitle })).toBeVisible();
    await expect(page.getByText(/editions/i)).toBeVisible();
  });

  test("visitor can filter books by title", async ({ page }) => {
    await page.goto("/books");
    await page.getByLabel("Title").fill("Dune");
    await expect(page.locator('a[href^="/books/"]')).toHaveCount(1, { timeout: 10000 });
  });
});
```

Note: this spec assumes seeded catalog data exists in the dev/test API (at least one book titled or containing "Dune", matching what Block 1's e2e setup already relies on for auth fixtures — check the existing e2e seed/fixture approach and align with it rather than assuming empty state).

- [ ] **Step 3: Run e2e spec**

Run: `pnpm exec playwright test e2e/catalog-browse.spec.ts`
Expected: PASS (requires dev server + seeded API running per the project's existing e2e run instructions — check `package.json`/`playwright.config.ts` for how Block 1's e2e test is invoked and follow the same setup)

- [ ] **Step 4: Commit**

```bash
git add e2e/catalog-browse.spec.ts
git commit -m "test(catalog): add Playwright happy path for browsing and viewing a book"
```

---

### Task 25: next-intl locale smoke test

**Files:**

- Create: `messages/messages.test.ts`

**Interfaces:**

- Consumes: `messages/en.json`, `messages/uk.json`.

- [ ] **Step 1: Write a structural parity test**

```ts
// messages/messages.test.ts
import { describe, expect, it } from "vitest";
import en from "./en.json";
import uk from "./uk.json";

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return collectKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe("i18n message parity", () => {
  it("en and uk expose the same set of keys", () => {
    const enKeys = collectKeys(en).sort();
    const ukKeys = collectKeys(uk).sort();
    expect(ukKeys).toEqual(enKeys);
  });

  it("no message value is an empty string", () => {
    const allValues = [...collectKeys(en), ...collectKeys(uk)];
    expect(allValues.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test messages`
Expected: PASS — if it fails, it means a key was added to one locale file but not the other somewhere in Tasks 1-23; fix the missing key(s) in whichever file is short before proceeding.

- [ ] **Step 3: Commit**

```bash
git add messages/messages.test.ts
git commit -m "test(i18n): add en/uk message key parity smoke test"
```

---

## Phase 7.5 — Non-Admin "Suggest an Edit" Flow (Contributions)

> Added after reconciling with a prior, independently-produced Block 2 spec found on `main` (2026-07-18, commit 98e069d) that correctly identified the `contributions` router as the only write path available to non-admin users. See the design doc's Addendum section for full detail. This phase is additive — it does not change or remove any task from Phases 1-7.

### Task 27: Contributions API client, types, hooks

**Files:**

- Modify: `lib/api/types.ts` (append contribution types)
- Create: `lib/api/contributions.ts`
- Create: `hooks/useContributions.ts`
- Create: `hooks/useContributions.test.tsx`

**Interfaces:**

- Consumes: `apiClient` from `lib/api/client.ts`.
- Produces: `createContribution`, `listOwnContributions`, `getContribution`, `updateContribution`, `submitContribution`, `deleteContribution` (API client); `useCreateContribution`, `useSubmitContribution`, `useMyContributions`, `useUpdateContribution`, `useDeleteContribution` (hooks) — consumed by `SuggestEditDialog` (Task 28) and the My Submissions page (Task 29).

- [ ] **Step 1: Append contribution types to `lib/api/types.ts`**

```ts
export type ContributionKind =
  | "new_book"
  | "new_release"
  | "new_contributor"
  | "edit_book"
  | "edit_release"
  | "edit_contributor";

export type ContributionStatus =
  "draft" | "submitted" | "under_review" | "approved" | "rejected" | "merged";

export interface CreateContributionPayload {
  kind: ContributionKind;
  target_id?: string | null;
  payload: Record<string, unknown>;
}

export interface UpdateContributionPayload {
  payload: Record<string, unknown>;
}

export interface ContributionResponse {
  id: string;
  user_id: string;
  kind: ContributionKind;
  target_id: string | null;
  payload: Record<string, unknown>;
  status: ContributionStatus;
  reviewer_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Implement lib/api/contributions.ts**

```ts
// lib/api/contributions.ts
import { apiClient } from "./client";
import type {
  ContributionResponse,
  CreateContributionPayload,
  Page,
  UpdateContributionPayload,
} from "./types";

export async function createContribution(
  payload: CreateContributionPayload,
): Promise<ContributionResponse> {
  const { data } = await apiClient.post("/contributions", payload);
  return data;
}

export async function listOwnContributions(
  params: { skip?: number; limit?: number } = {},
): Promise<Page<ContributionResponse>> {
  const { data } = await apiClient.get("/contributions/me/contributions", { params });
  return data;
}

export async function getContribution(contributionId: string): Promise<ContributionResponse> {
  const { data } = await apiClient.get(`/contributions/${contributionId}`);
  return data;
}

export async function updateContribution(
  contributionId: string,
  payload: UpdateContributionPayload,
): Promise<ContributionResponse> {
  const { data } = await apiClient.patch(`/contributions/${contributionId}`, payload);
  return data;
}

export async function submitContribution(contributionId: string): Promise<ContributionResponse> {
  const { data } = await apiClient.post(`/contributions/${contributionId}/submit`);
  return data;
}

export async function deleteContribution(contributionId: string): Promise<void> {
  await apiClient.delete(`/contributions/${contributionId}`);
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Write hooks/useContributions.test.tsx**

```tsx
// hooks/useContributions.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  useCreateContribution,
  useMyContributions,
  useSubmitContribution,
} from "./useContributions";

const server = setupServer(
  http.post("/api/contributions", async ({ request }) => {
    const body = (await request.json()) as { kind: string };
    return HttpResponse.json(
      {
        id: "c1",
        user_id: "u1",
        kind: body.kind,
        target_id: null,
        payload: {},
        status: "draft",
        reviewer_id: null,
        review_notes: null,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
      { status: 201 },
    );
  }),
  http.post("/api/contributions/:id/submit", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      user_id: "u1",
      kind: "new_book",
      target_id: null,
      payload: {},
      status: "submitted",
      reviewer_id: null,
      review_notes: null,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    });
  }),
  http.get("/api/contributions/me/contributions", () => {
    return HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useCreateContribution", () => {
  it("creates a draft contribution", async () => {
    const { result } = renderHook(() => useCreateContribution(), { wrapper });
    act(() => result.current.mutate({ kind: "new_book", payload: { title: "Dune" } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("draft");
  });
});

describe("useSubmitContribution", () => {
  it("submits a draft contribution", async () => {
    const { result } = renderHook(() => useSubmitContribution(), { wrapper });
    act(() => result.current.mutate("c1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("submitted");
  });
});

describe("useMyContributions", () => {
  it("lists the current user's contributions", async () => {
    const { result } = renderHook(() => useMyContributions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test useContributions`
Expected: FAIL — `hooks/useContributions.ts` not found.

- [ ] **Step 7: Implement hooks/useContributions.ts**

```ts
// hooks/useContributions.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContribution,
  deleteContribution,
  getContribution,
  listOwnContributions,
  submitContribution,
  updateContribution,
} from "@/lib/api/contributions";
import type { CreateContributionPayload, UpdateContributionPayload } from "@/lib/api/types";

export function useMyContributions(params: { skip?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["contributions", "me", params],
    queryFn: () => listOwnContributions(params),
  });
}

export function useContribution(contributionId: string | undefined) {
  return useQuery({
    queryKey: ["contributions", contributionId],
    queryFn: () => getContribution(contributionId as string),
    enabled: Boolean(contributionId),
  });
}

export function useCreateContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContributionPayload) => createContribution(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributions", "me"] }),
  });
}

export function useUpdateContribution(contributionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateContributionPayload) => updateContribution(contributionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions", contributionId] });
      queryClient.invalidateQueries({ queryKey: ["contributions", "me"] });
    },
  });
}

export function useSubmitContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => submitContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributions", "me"] }),
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => deleteContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributions", "me"] }),
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test useContributions`
Expected: PASS

- [ ] **Step 9: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add lib/api/types.ts lib/api/contributions.ts hooks/useContributions.ts hooks/useContributions.test.tsx
git commit -m "feat(catalog): add contributions API client, types, and hooks"
```

---

### Task 28: SuggestEditDialog component

**Files:**

- Create: `components/catalog/suggest-edit-dialog.tsx`
- Create: `components/catalog/suggest-edit-dialog.stories.tsx`
- Create: `components/catalog/suggest-edit-dialog.test.tsx`
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.suggestEdit` namespace)

**Interfaces:**

- Consumes: `useCreateContribution`, `useSubmitContribution` (Task 27); `useMe` (existing, Block 1).
- Produces: `SuggestEditDialog({ kind: ContributionKind, targetId?: string, buildPayload: () => Record<string, unknown> }): JSX.Element` — a generic trigger+dialog; the caller supplies `kind`, optional `targetId`, and a `buildPayload` callback that reads its own local form state into the shape the API expects. This task builds the dialog shell with a **generic JSON-free text-field form for the common "new_book" case** (title + description, matching `CreateBookSchema`'s required fields) — book detail/contributor detail/external-search call sites (wired in Task 29) pass their own `kind`/`targetId`/`buildPayload` for their specific entity type, reusing the same dialog shell and submit flow.

- [ ] **Step 1: Add message keys**

`messages/en.json` under `catalog`:

```json
"suggestEdit": {
  "trigger": "Suggest an edit",
  "newBookTitle": "Suggest a new book",
  "titleLabel": "Title",
  "descriptionLabel": "Description",
  "submit": "Submit for review",
  "submitting": "Submitting...",
  "submitted": "Submitted for review.",
  "signInRequired": "Sign in to suggest an edit."
}
```

`messages/uk.json`:

```json
"suggestEdit": {
  "trigger": "Запропонувати зміну",
  "newBookTitle": "Запропонувати нову книгу",
  "titleLabel": "Назва",
  "descriptionLabel": "Опис",
  "submit": "Надіслати на розгляд",
  "submitting": "Надсилання...",
  "submitted": "Надіслано на розгляд.",
  "signInRequired": "Увійдіть, щоб запропонувати зміну."
}
```

- [ ] **Step 2: Write test**

```tsx
// components/catalog/suggest-edit-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { SuggestEditDialog } from "./suggest-edit-dialog";
import enMessages from "@/messages/en.json";

const server = setupServer(
  http.post("/api/contributions", () => {
    return HttpResponse.json(
      {
        id: "c1",
        user_id: "u1",
        kind: "new_book",
        target_id: null,
        payload: {},
        status: "draft",
        reviewer_id: null,
        review_notes: null,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
      { status: 201 },
    );
  }),
  http.post("/api/contributions/:id/submit", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      user_id: "u1",
      kind: "new_book",
      target_id: null,
      payload: {},
      status: "submitted",
      reviewer_id: null,
      review_notes: null,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <SuggestEditDialog
          kind="new_book"
          buildPayload={() => ({ title: "Dune", description: "A sci-fi epic." })}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("SuggestEditDialog", () => {
  it("creates and submits a contribution on confirm", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Suggest an edit" }));
    await user.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(screen.getByText("Submitted for review.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Implement SuggestEditDialog**

```tsx
// components/catalog/suggest-edit-dialog.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateContribution, useSubmitContribution } from "@/hooks/useContributions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ContributionKind } from "@/lib/api/types";

export function SuggestEditDialog({
  kind,
  targetId,
  buildPayload,
}: {
  kind: ContributionKind;
  targetId?: string;
  buildPayload: () => Record<string, unknown>;
}) {
  const t = useTranslations("catalog.suggestEdit");
  const createContribution = useCreateContribution();
  const submitContribution = useSubmitContribution();

  const isPending = createContribution.isPending || submitContribution.isPending;
  const isSubmitted = submitContribution.isSuccess;
  const error = createContribution.error ?? submitContribution.error;

  function handleSubmit() {
    createContribution.mutate(
      { kind, target_id: targetId ?? null, payload: buildPayload() },
      {
        onSuccess: (contribution) => submitContribution.mutate(contribution.id),
      },
    );
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newBookTitle")}</DialogTitle>
        </DialogHeader>
        {isSubmitted && <p className="text-muted-foreground text-sm">{t("submitted")}</p>}
        {error && <p className="text-destructive text-sm">{extractErrorMessage(error)}</p>}
        <DialogFooter>
          <Button disabled={isPending || isSubmitted} onClick={handleSubmit}>
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test suggest-edit-dialog`
Expected: PASS

- [ ] **Step 5: Write story**

```tsx
// components/catalog/suggest-edit-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuggestEditDialog } from "./suggest-edit-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof SuggestEditDialog> = {
  title: "Catalog/SuggestEditDialog",
  component: SuggestEditDialog,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Story />
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const NewBook: StoryObj<typeof SuggestEditDialog> = {
  args: {
    kind: "new_book",
    buildPayload: () => ({ title: "Dune", description: "A sci-fi epic." }),
  },
};

export const EditExistingBook: StoryObj<typeof SuggestEditDialog> = {
  args: {
    kind: "edit_book",
    targetId: "b1",
    buildPayload: () => ({ title: "Dune (revised)" }),
  },
};
```

- [ ] **Step 6: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/catalog/suggest-edit-dialog.tsx components/catalog/suggest-edit-dialog.stories.tsx components/catalog/suggest-edit-dialog.test.tsx messages/
git commit -m "feat(catalog): add SuggestEditDialog component"
```

---

### Task 29: Wire SuggestEditDialog into public pages + My Submissions page

**Files:**

- Modify: `app/(app)/books/[id]/page.tsx` (add SuggestEditDialog for non-admin signed-in users, `kind: "edit_book"`)
- Modify: `app/(app)/contributors/[id]/page.tsx` (same, `kind: "edit_contributor"`)
- Modify: `app/(app)/external/page.tsx` (same on each hit card, `kind: "new_book"`, for non-admin signed-in users — admins still get `ImportBookDialog` from Task 17, not this)
- Create: `app/(app)/contributions/page.tsx` (My Submissions, read-only list)
- Modify: `components/shell/header.tsx` (add "My Submissions" link to the user dropdown menu)
- Modify: `messages/en.json`, `messages/uk.json` (add `catalog.myContributions` namespace)

**Interfaces:**

- Consumes: `SuggestEditDialog` (Task 28), `useMyContributions` (Task 27), `useMe` (existing).

- [ ] **Step 1: Add message keys**

`messages/en.json` under `catalog`:

```json
"myContributions": {
  "navLink": "My Submissions",
  "title": "My Submissions",
  "empty": "You haven't submitted any suggestions yet.",
  "status": {
    "draft": "Draft",
    "submitted": "Submitted",
    "under_review": "Under review",
    "approved": "Approved",
    "rejected": "Rejected",
    "merged": "Merged"
  }
}
```

`messages/uk.json`:

```json
"myContributions": {
  "navLink": "Мої пропозиції",
  "title": "Мої пропозиції",
  "empty": "Ви ще не надсилали пропозицій.",
  "status": {
    "draft": "Чернетка",
    "submitted": "Надіслано",
    "under_review": "На розгляді",
    "approved": "Схвалено",
    "rejected": "Відхилено",
    "merged": "Об'єднано"
  }
}
```

- [ ] **Step 2: Add SuggestEditDialog to book detail page**

In `app/(app)/books/[id]/page.tsx`, import `SuggestEditDialog` and `useMe`. Read the existing implementation from Task 15 before editing — add, near the title/description block:

```tsx
import { SuggestEditDialog } from "@/components/catalog/suggest-edit-dialog";
import { useMe } from "@/hooks/useMe";

// inside the component, after existing hooks:
const { data: me } = useMe();

// in the JSX, after the title/description block:
{
  me && !me.is_admin && (
    <SuggestEditDialog
      kind="edit_book"
      targetId={book.id}
      buildPayload={() => ({ title: book.title, description: book.description })}
    />
  );
}
```

- [ ] **Step 3: Add SuggestEditDialog to contributor detail page**

Same pattern in `app/(app)/contributors/[id]/page.tsx`, `kind: "edit_contributor"`, `targetId={contributor.id}`, `buildPayload={() => ({ full_name: contributor.full_name, bio: contributor.bio })}`.

- [ ] **Step 4: Add SuggestEditDialog to external search hit cards**

In `app/(app)/external/page.tsx`, read the existing implementation from Task 17 first. Alongside the existing `{me?.is_admin && <ImportBookDialog hit={hit} />}` line, add the non-admin equivalent:

```tsx
{
  me && !me.is_admin && (
    <SuggestEditDialog
      kind="new_book"
      buildPayload={() => ({ title: hit.title, description: hit.authors.join(", ") })}
    />
  );
}
```

- [ ] **Step 5: Implement My Submissions page**

```tsx
// app/(app)/contributions/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { useMyContributions } from "@/hooks/useContributions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContributionStatus } from "@/lib/api/types";

export default function MyContributionsPage() {
  const t = useTranslations("catalog.myContributions");
  const { data, isPending } = useMyContributions({ limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && (data?.items.length ?? 0) === 0 && (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}
      <div className="flex flex-col gap-3">
        {(data?.items ?? []).map((contribution) => (
          <Card key={contribution.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{contribution.kind}</CardTitle>
              <Badge variant="secondary">
                {t(`status.${contribution.status as ContributionStatus}`)}
              </Badge>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add nav link to header dropdown**

In `components/shell/header.tsx`, read the current implementation (from Task 15's header edit) first. Add a `DropdownMenuItem` linking to `/contributions` inside the existing authenticated dropdown menu, using `useTranslations("catalog.myContributions")` for the label:

````tsx
<DropdownMenuItem render={<Link href="/contributions" />}>{t("navLink")}</DropdownMenuItem>
```//place alongside the existing "Profile" item.

- [ ] **Step 7: Run typecheck, lint, tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 8: Run build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/\(app\)/books/\[id\]/page.tsx app/\(app\)/contributors/\[id\]/page.tsx app/\(app\)/external/page.tsx app/\(app\)/contributions/ components/shell/header.tsx messages/
git commit -m "feat(catalog): wire SuggestEditDialog into detail/search pages, add My Submissions page"
````

---

### Task 30: Final gate — full repo verification

**Files:** none (verification only)

- [ ] **Step 1: Run full lint**

Run: `pnpm lint`
Expected: PASS. Fix any violations found.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS. Fix any type errors found.

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: PASS. Fix any failing tests found.

- [ ] **Step 4: Run format check**

Run: `pnpm format:check`
Expected: PASS. If it fails, run `pnpm format` and re-check.

- [ ] **Step 5: Run production build**

Run: `pnpm build`
Expected: PASS. Fix any build errors found.

- [ ] **Step 6: Run Storybook build**

Run: `pnpm build-storybook`
Expected: PASS. Fix any story errors found.

- [ ] **Step 7: Manually verify the admin boundary**

Start the dev server (`pnpm dev`), log in as a non-admin user, navigate directly to `/admin/catalog/books` — confirm it redirects to `/`. Log in as an admin user (or manually set `is_admin: true` on a seeded test user if the dev API supports it), confirm `/admin/catalog/books` renders.

- [ ] **Step 8: Manually verify the locale switcher**

In the running dev server, click the locale switcher in the header, select Ukrainian, confirm the page text changes and persists across a refresh.

- [ ] **Step 9: Commit any final fixes**

If Steps 1-6 required fixes, commit them:

```bash
git add -A
git commit -m "fix: resolve gate failures (lint/typecheck/test/format/build)"
```

- [ ] **Step 10: Push branch and open PR**

```bash
git push -u origin worktree-block-2-catalog
gh pr create --title "Block 2: Catalog (public browse, admin management, contributions, history, i18n)" --body "$(cat <<'EOF'
## Summary
- Public book/release/contributor browsing and detail pages
- External source search + admin import
- Full admin catalog CRUD (books, releases, contributors) with merge and contributor-attach flows
- Non-admin "Suggest an edit" flow via the `contributions` router (new book/release/contributor proposals and edits to existing entities), plus a read-only "My Submissions" list
- Version history + diff viewer for books/releases/contributors
- next-intl (en/uk) infrastructure, including migration of existing Block 1 (auth/profile) strings

## Admin boundary
- Routes under `/admin/catalog/**`, gated by `proxy.ts` (presence check) + a server-side `is_admin` layout guard (`app/(app)/admin/catalog/layout.tsx`)
- Interim approach — not blocking: fedorkovolodymyr/bookworm-hole-api#144 requests an `is_admin` JWT claim for faster edge-middleware gating later

## Scope note
This block was reconciled mid-implementation against a prior, independently-produced Block 2 spec found on `main` (98e069d, 2026-07-18) that scoped Block 2 as read-only + contributions only, deferring admin CRUD to Block 7. This PR keeps the admin-CRUD-in-Block-2 decision (explicitly re-confirmed with the human after verifying `require_admin` gating against source) but adds the contributions flow the prior spec had already identified as a gap in this session's original plan. See `docs/superpowers/specs/2026-07-19-block-2-catalog-design.md`'s Addendum section for the full reconciliation.

## Test plan
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm build && pnpm build-storybook` all pass
- [ ] Non-admin redirected away from `/admin/catalog/**`
- [ ] Admin can create/edit/merge a book, attach a contributor, import from external search
- [ ] Non-admin can submit a "Suggest an edit" proposal and see it in My Submissions
- [ ] Locale switcher changes UI language and persists across refresh
- [ ] Playwright e2e catalog browse spec passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Plan Self-Review Notes

- **Spec coverage:** i18n infra + Block 1 migration (Tasks 1-4), API clients (Tasks 5-8), hooks (Tasks 9-10), public catalog pages/components (Tasks 11-15), admin boundary (Task 16), external search/import (Task 17), admin forms (Tasks 18-19), admin pages (Tasks 20-21), history/diff viewer (Tasks 22-23), e2e + i18n smoke test (Tasks 24-25), non-admin contributions flow (Tasks 27-29), final gate (Task 30) — all design doc sections (including the Addendum) have a corresponding task.
- **Known follow-up, not a gap:** JWT-claim-based edge admin gating is explicitly deferred to bookworm-hole-api#144; Task 16 implements the agreed interim (server-side layout check). Contribution moderation (approve/reject) is explicitly Block 7's job, not this block's — Task 29's My Submissions page is read-only by design.
- **Type consistency:** `BookResponse` (list-view, no releases) vs `BookWithReleasesResponse` (detail-view) is used consistently — `useBookList`/`listBooks` return `Page<BookResponse>`, `useBook`/`getBook` return `BookWithReleasesResponse`, matching the real API contract flagged in Task 6.
- **Contributor attach 200-status quirk:** handled by branching on response body (`AddContributorResult.status`) in `AttachContributorDialog` (Task 19), never on HTTP status.
- **External import rating quirk:** flagged in Global Constraints and handled by `ImportBookDialog`/`useImportBook` test asserting `rating_count: 0`/`average_rating: null` explicitly (Task 10, Task 17).
- **Admin vs. non-admin write paths:** Task 29 explicitly gates `SuggestEditDialog` to `me && !me.is_admin` and `ImportBookDialog`/admin forms to `me?.is_admin`, so the two write paths (direct admin CRUD vs. contribution proposal) never both render for the same user.
