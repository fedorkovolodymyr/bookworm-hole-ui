# Block 1 (Auth & Session) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real authentication into `bookworm-hole-ui` — register, login, logout, silent refresh, profile view/edit, change password, deactivate/delete (with cancel) account, email verification — establishing the BFF cookie + CSRF pattern every later block reuses.

**Architecture:** Next.js Route Handlers under `app/api/auth/*` and `app/api/users/*` act as a BFF: they hold the only code that talks to `bookworm-hole-api` with a bearer token, and translate that into httpOnly `access_token`/`refresh_token` cookies plus a readable `csrf_token` cookie for the browser. `middleware.ts` gates the `(app)` route group by cookie presence. Client components call the BFF (never the real API directly) through an axios instance that attaches `X-CSRF-Token` on mutations and retries once through `/api/auth/refresh` on a 401. TanStack Query hooks wrap every BFF call; forms are plain controlled components using the existing `components/ui/*` kit.

**Tech Stack:** Next.js 16 App Router Route Handlers, TanStack Query v5, axios, `js-cookie` (client-side cookie read for CSRF token), Vitest + RTL + msw for tests, existing shadcn/`@base-ui` kit from Block 0.

## Global Constraints

- Package manager: pnpm only (per parent spec's Stack table).
- TypeScript strict mode — already set, do not weaken.
- Branch: `block-1-auth-session` (already created off `main`, currently checked out — contains the spec-addendum commit `503ee99`). PR via `gh pr create`, merge through GitHub — never push directly to `main`.
- The real API is bearer-token only and sets no cookies; all cookie handling is this repo's BFF responsibility (per spec's "Auth Architecture" section).
- Cookies: `access_token` and `refresh_token` httpOnly, `Secure` in prod, `SameSite=Lax`, path `/`. `csrf_token` NOT httpOnly, `SameSite=Lax`, `Secure` in prod, same lifetime as `access_token`. (Per spec CSRF addendum.)
- Every mutating BFF route (everything except `login`, `register`) must 403 on missing/mismatched `X-CSRF-Token` header vs `csrf_token` cookie before proxying to the real API.
- `API_BASE_URL` env var (server-only, e.g. `http://localhost:8000/api/v1`) is required by BFF routes — add `.env.example` documenting it.
- Every component ships a Storybook story (per Block 0 convention) and a Vitest+RTL test.
- Do not implement forgot-password (no such API endpoint exists — out of scope per spec).
- Do not implement admin user management or OAuth (out of scope per spec).

---

## File Structure

```text
bookworm-hole-ui/
  .env.example                          # CREATE: documents API_BASE_URL
  lib/
    api/
      client.ts                         # CREATE: browser axios instance (BFF baseURL, CSRF header, 401 retry)
      server-client.ts                  # CREATE: server-only axios instance (bearer token, calls real API)
      auth.ts                           # CREATE: typed BFF-calling functions for auth actions
      users.ts                          # CREATE: typed BFF-calling functions for profile actions
      types.ts                          # CREATE: shared response/request types matching API schemas
    auth/
      cookies.ts                        # CREATE: server-only cookie get/set/clear helpers + CSRF check
      csrf.ts                           # CREATE: CSRF token generation + comparison helper
    query-client.tsx                    # CREATE: QueryClientProvider wrapper (client component)
  hooks/
    useAuth.ts                          # CREATE: useLogin, useRegister, useLogout mutations
    useMe.ts                            # CREATE: useMe query
    useProfile.ts                       # CREATE: useUpdateProfile, useChangePassword, useDeactivateAccount, useDeleteAccount, useCancelDeleteAccount
  app/
    layout.tsx                          # MODIFY: wrap children in QueryClientProvider
    page.tsx                            # MODIFY: use AppShell, drop create-next-app boilerplate
    api/
      auth/
        register/route.ts               # CREATE
        login/route.ts                  # CREATE
        logout/route.ts                 # CREATE
        refresh/route.ts                 # CREATE
        verify/
          request/route.ts               # CREATE
          confirm/route.ts               # CREATE
      users/
        me/route.ts                      # CREATE (GET, PATCH)
        me/password/route.ts             # CREATE (POST)
        me/deactivate/route.ts           # CREATE (POST)
        me/delete/route.ts                # CREATE (POST)
        me/delete/cancel/route.ts          # CREATE (POST)
    (auth)/
      layout.tsx                        # CREATE: centers auth forms, redirects if already logged in
      login/page.tsx                    # CREATE
      register/page.tsx                 # CREATE
      verify/page.tsx                   # CREATE: reads ?token=, calls confirm
    (app)/
      layout.tsx                        # CREATE: wraps AppShell, requires session (middleware handles redirect)
      profile/page.tsx                  # CREATE
  components/
    auth/
      login-form.tsx / .stories.tsx / .test.tsx        # CREATE
      register-form.tsx / .stories.tsx / .test.tsx      # CREATE
      email-verification-banner.tsx / .stories.tsx / .test.tsx  # CREATE
    profile/
      profile-form.tsx / .stories.tsx / .test.tsx        # CREATE
      change-password-form.tsx / .stories.tsx / .test.tsx # CREATE
      delete-account-section.tsx / .stories.tsx / .test.tsx # CREATE
    shell/
      header.tsx                        # MODIFY: real auth state (user menu vs Sign in)
      header.test.tsx                   # MODIFY: cover both auth states
      header.stories.tsx                # MODIFY: add authenticated variant
  middleware.ts                          # CREATE: gate (app) routes by access_token cookie
  tests/
    mocks/
      handlers.ts                        # CREATE: msw handlers for BFF routes
      server.ts                          # CREATE: msw node server setup
    setup.ts                             # MODIFY: start/stop msw server
  e2e/
    auth.spec.ts                          # CREATE: register -> app shell -> logout -> login
  package.json                           # MODIFY: add deps
```

Rationale: `lib/api/client.ts` (browser) and `lib/api/server-client.ts` (server, real API) are split because they have different auth mechanisms (cookie-relayed CSRF vs bearer token) and different callers (client components vs route handlers) — collapsing them would mix concerns the spec explicitly separates. `lib/auth/cookies.ts` and `csrf.ts` are split from route handlers so every route handler shares one implementation instead of six copies drifting apart.

---

## Task 1: Install Dependencies, Add `.env.example`

**Files:**
- Modify: `package.json`
- Create: `.env.example`

**Interfaces:**
- Produces: `axios`, `@tanstack/react-query`, `js-cookie`, `msw` importable by every later task.

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add axios @tanstack/react-query js-cookie
pnpm add -D msw @types/js-cookie
```

- [ ] **Step 2: Write `.env.example`**

```text
# Base URL of the bookworm-hole-api instance this UI talks to (server-only).
API_BASE_URL=http://localhost:8000/api/v1
```

- [ ] **Step 3: Run install verification**

Run: `pnpm typecheck`
Expected: no errors (nothing consumes the new deps yet).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add axios, TanStack Query, js-cookie, msw"
```

---

## Task 2: Shared API Types

**Files:**
- Create: `lib/api/types.ts`

**Interfaces:**
- Produces: `UserResponse`, `UserProfileResponse`, `AuthTokens`, `RegisterPayload`, `LoginPayload`, `UpdateProfilePayload`, `ChangePasswordPayload` — consumed by every task in `lib/api/`, `hooks/`, and `app/api/`.

- [ ] **Step 1: Write types matching the API schemas from the spec**

```typescript
// lib/api/types.ts
export interface UserResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified_at: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  is_active: boolean;
  is_admin: boolean;
  deletion_scheduled_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  display_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ApiErrorBody {
  detail: string | { msg: string; loc: (string | number)[] }[];
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat: add shared auth/user API types"
```

---

## Task 3: Cookie + CSRF Helpers

**Files:**
- Create: `lib/auth/csrf.ts`
- Create: `lib/auth/cookies.ts`
- Test: `lib/auth/csrf.test.ts`

**Interfaces:**
- Produces: `generateCsrfToken(): string`, `verifyCsrfToken(cookieValue: string | undefined, headerValue: string | null): boolean` from `csrf.ts`; `setAuthCookies(response: NextResponse, tokens: AuthTokens): void`, `clearAuthCookies(response: NextResponse): void`, `getAccessToken(request: NextRequest): string | undefined`, `getRefreshToken(request: NextRequest): string | undefined` from `cookies.ts`.
- Consumes: `AuthTokens` from `lib/api/types.ts` (Task 2).

- [ ] **Step 1: Write failing test for CSRF verify**

```typescript
// lib/auth/csrf.test.ts
import { describe, expect, it } from "vitest";
import { generateCsrfToken, verifyCsrfToken } from "./csrf";

describe("csrf", () => {
  it("generates a non-empty random token", () => {
    const token = generateCsrfToken();
    expect(token).toBeTruthy();
    expect(generateCsrfToken()).not.toBe(token);
  });

  it("passes when header matches cookie", () => {
    expect(verifyCsrfToken("abc123", "abc123")).toBe(true);
  });

  it("fails when header is missing", () => {
    expect(verifyCsrfToken("abc123", null)).toBe(false);
  });

  it("fails when cookie is missing", () => {
    expect(verifyCsrfToken(undefined, "abc123")).toBe(false);
  });

  it("fails when header does not match cookie", () => {
    expect(verifyCsrfToken("abc123", "xyz789")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/auth/csrf.test.ts`
Expected: FAIL — `./csrf` not found.

- [ ] **Step 3: Implement `lib/auth/csrf.ts`**

```typescript
// lib/auth/csrf.ts
import { randomBytes } from "node:crypto";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyCsrfToken(
  cookieValue: string | undefined,
  headerValue: string | null,
): boolean {
  if (!cookieValue || !headerValue) return false;
  return cookieValue === headerValue;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/auth/csrf.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement `lib/auth/cookies.ts`**

```typescript
// lib/auth/cookies.ts
import type { NextRequest, NextResponse } from "next/server";
import type { AuthTokens } from "@/lib/api/types";
import { generateCsrfToken } from "./csrf";

const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 min, matches API access_token_expire_minutes
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches API refresh_token_expire_days

const isProd = process.env.NODE_ENV === "production";

export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  response.cookies.set("access_token", tokens.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  response.cookies.set("csrf_token", generateCsrfToken(), {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("csrf_token");
}

export function getAccessToken(request: NextRequest): string | undefined {
  return request.cookies.get("access_token")?.value;
}

export function getRefreshToken(request: NextRequest): string | undefined {
  return request.cookies.get("refresh_token")?.value;
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/auth/csrf.ts lib/auth/csrf.test.ts lib/auth/cookies.ts
git commit -m "feat: add CSRF token and auth cookie helpers"
```

---

## Task 4: Server-Only API Client (Real API)

**Files:**
- Create: `lib/api/server-client.ts`

**Interfaces:**
- Produces: `createServerApiClient(accessToken?: string): AxiosInstance` — consumed by every `app/api/*` route handler (Tasks 6-8).
- Consumes: nothing new (reads `API_BASE_URL` from `process.env`).

- [ ] **Step 1: Implement**

```typescript
// lib/api/server-client.ts
import axios, { type AxiosInstance } from "axios";

export function createServerApiClient(accessToken?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.API_BASE_URL,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return instance;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api/server-client.ts
git commit -m "feat: add server-only axios client for real API calls"
```

---

## Task 5: Browser API Client (BFF)

**Files:**
- Create: `lib/api/client.ts`
- Test: `lib/api/client.test.ts`

**Interfaces:**
- Produces: default-exported `apiClient: AxiosInstance` — consumed by `lib/api/auth.ts` and `lib/api/users.ts` (Tasks 6-7).
- Consumes: `js-cookie` (Task 1).

- [ ] **Step 1: Write failing test**

```typescript
// lib/api/client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import Cookies from "js-cookie";

vi.mock("js-cookie", () => ({
  default: { get: vi.fn() },
}));

describe("apiClient", () => {
  beforeEach(() => {
    vi.mocked(Cookies.get).mockReturnValue("test-csrf-token");
  });

  it("attaches X-CSRF-Token header from cookie on POST requests", async () => {
    const { apiClient } = await import("./client");
    const config = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (c: import("axios").InternalAxiosRequestConfig) => import("axios").InternalAxiosRequestConfig }[];
    };
    const result = config.handlers[0].fulfilled({
      method: "post",
      headers: {} as import("axios").AxiosRequestHeaders,
    } as import("axios").InternalAxiosRequestConfig);
    expect(result.headers["X-CSRF-Token"]).toBe("test-csrf-token");
  });

  it("does not attach X-CSRF-Token header on GET requests", async () => {
    const { apiClient } = await import("./client");
    const config = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (c: import("axios").InternalAxiosRequestConfig) => import("axios").InternalAxiosRequestConfig }[];
    };
    const result = config.handlers[0].fulfilled({
      method: "get",
      headers: {} as import("axios").AxiosRequestHeaders,
    } as import("axios").InternalAxiosRequestConfig);
    expect(result.headers["X-CSRF-Token"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/api/client.test.ts`
Expected: FAIL — `./client` not found.

- [ ] **Step 3: Implement `lib/api/client.ts`**

```typescript
// lib/api/client.ts
import axios from "axios";
import Cookies from "js-cookie";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

apiClient.interceptors.request.use((config) => {
  if (config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
    const csrfToken = Cookies.get("csrf_token");
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

let refreshPromise: Promise<void> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= apiClient.post("/auth/refresh").then(() => undefined);
        await refreshPromise;
        refreshPromise = null;
        return apiClient(originalRequest);
      } catch {
        refreshPromise = null;
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/api/client.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/api/client.ts lib/api/client.test.ts
git commit -m "feat: add browser BFF axios client with CSRF header and 401 retry"
```

---

## Task 6: Auth BFF Routes (register, login, logout, refresh)

**Files:**
- Create: `app/api/auth/register/route.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/refresh/route.ts`
- Test: `app/api/auth/register/route.test.ts`
- Test: `app/api/auth/login/route.test.ts`
- Test: `app/api/auth/logout/route.test.ts`
- Test: `app/api/auth/refresh/route.test.ts`

**Interfaces:**
- Consumes: `createServerApiClient` (Task 4), `setAuthCookies`/`clearAuthCookies`/`getRefreshToken` (Task 3), `verifyCsrfToken` (Task 3), `RegisterPayload`/`LoginPayload`/`AuthTokens` (Task 2).
- Produces: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh` — consumed by `lib/api/auth.ts` (Task 9) and `middleware.ts` (Task 11).

- [ ] **Step 1: Write failing test for register route**

```typescript
// app/api/auth/register/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    post: vi.fn().mockResolvedValue({
      data: {
        user: { id: "1", email: "a@b.com", username: "a", display_name: "A" },
        access_token: "at",
        refresh_token: "rt",
        token_type: "bearer",
      },
    }),
  }),
}));

describe("POST /api/auth/register", () => {
  it("proxies to the API and sets auth cookies", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "a@b.com",
        username: "a",
        password: "pw",
        display_name: "A",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("access_token");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test app/api/auth/register/route.test.ts`
Expected: FAIL — `./route` not found.

- [ ] **Step 3: Implement `app/api/auth/register/route.ts`**

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { setAuthCookies } from "@/lib/auth/cookies";
import type { RegisterPayload, UserResponse } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const payload: RegisterPayload = await request.json();
  const client = createServerApiClient();

  try {
    const { data } = await client.post<{
      user: UserResponse;
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>("/auth/register", payload);

    const response = NextResponse.json({ user: data.user }, { status: 201 });
    setAuthCookies(response, data);
    return response;
  } catch (error) {
    if (axiosIsError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Registration failed" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}

function axiosIsError(error: unknown): error is { response?: { data?: unknown; status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test app/api/auth/register/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `app/api/auth/login/route.ts`** (mirrors register, no CSRF check — pre-session)

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { setAuthCookies } from "@/lib/auth/cookies";
import type { LoginPayload, UserResponse } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const payload: LoginPayload = await request.json();
  const client = createServerApiClient();

  try {
    const { data } = await client.post<{
      user: UserResponse;
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>("/auth/login", payload);

    const response = NextResponse.json({ user: data.user }, { status: 200 });
    setAuthCookies(response, data);
    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(error.response?.data ?? { detail: "Login failed" }, {
        status: error.response?.status ?? 500,
      });
    }
    throw error;
  }
}

function isAxiosError(error: unknown): error is { response?: { data?: unknown; status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}
```

- [ ] **Step 6: Write failing test for logout route (CSRF-gated)**

```typescript
// app/api/auth/logout/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post: vi.fn().mockResolvedValue({}) }),
}));

describe("POST /api/auth/logout", () => {
  it("returns 403 when CSRF header is missing", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: "refresh_token=rt; csrf_token=abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("clears cookies and returns 204 when CSRF header matches", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: "refresh_token=rt; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("access_token=;");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm test app/api/auth/logout/route.test.ts`
Expected: FAIL — `./route` not found.

- [ ] **Step 8: Implement `app/api/auth/logout/route.ts`**

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { clearAuthCookies, getRefreshToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const refreshToken = getRefreshToken(request);
  const client = createServerApiClient();

  if (refreshToken) {
    try {
      await client.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      // Already-invalid refresh token shouldn't block clearing local cookies.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm test app/api/auth/logout/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Write failing test for refresh route**

```typescript
// app/api/auth/refresh/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    post: vi.fn().mockResolvedValue({
      data: { access_token: "new-at", refresh_token: "new-rt", token_type: "bearer" },
    }),
  }),
}));

describe("POST /api/auth/refresh", () => {
  it("returns 401 when no refresh_token cookie present", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("sets new cookies on success", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { cookie: "refresh_token=old-rt" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("access_token=new-at");
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

Run: `pnpm test app/api/auth/refresh/route.test.ts`
Expected: FAIL — `./route` not found.

- [ ] **Step 12: Implement `app/api/auth/refresh/route.ts`**

Note: refresh is intentionally NOT CSRF-gated — it's called automatically by the axios response interceptor (Task 5) after a 401, not by explicit user action, and requires only the httpOnly `refresh_token` cookie an attacker's page cannot read or forge meaningfully more than any other cross-site POST already blocked by `SameSite=Lax`.

```typescript
// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { setAuthCookies, getRefreshToken, clearAuthCookies } from "@/lib/auth/cookies";
import type { AuthTokens } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const refreshToken = getRefreshToken(request);
  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
  }

  const client = createServerApiClient();
  try {
    const { data } = await client.post<AuthTokens>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, data);
    return response;
  } catch {
    const response = NextResponse.json({ detail: "Refresh failed" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `pnpm test app/api/auth/refresh/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 14: Commit**

```bash
git add app/api/auth/register app/api/auth/login app/api/auth/logout app/api/auth/refresh
git commit -m "feat: add BFF auth routes (register, login, logout, refresh)"
```

---

## Task 7: Auth BFF Routes (email verification)

**Files:**
- Create: `app/api/auth/verify/request/route.ts`
- Create: `app/api/auth/verify/confirm/route.ts`
- Test: `app/api/auth/verify/request/route.test.ts`
- Test: `app/api/auth/verify/confirm/route.test.ts`

**Interfaces:**
- Consumes: `createServerApiClient` (Task 4), `getAccessToken` (Task 3), `verifyCsrfToken` (Task 3).
- Produces: `POST /api/auth/verify/request`, `POST /api/auth/verify/confirm` — consumed by `lib/api/auth.ts` (Task 9).

- [ ] **Step 1: Write failing test for verify/request**

```typescript
// app/api/auth/verify/request/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post: vi.fn().mockResolvedValue({}) }),
}));

describe("POST /api/auth/verify/request", () => {
  it("returns 403 without matching CSRF token", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/verify/request", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("returns 202 with matching CSRF token", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/verify/request", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(202);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test app/api/auth/verify/request/route.test.ts`
Expected: FAIL — `./route` not found.

- [ ] **Step 3: Implement `app/api/auth/verify/request/route.ts`**

```typescript
// app/api/auth/verify/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  await client.post("/auth/verify/request");
  return new NextResponse(null, { status: 202 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test app/api/auth/verify/request/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write failing test for verify/confirm**

```typescript
// app/api/auth/verify/confirm/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    post: vi.fn().mockResolvedValue({
      data: { id: "1", email: "a@b.com", username: "a", display_name: "A", email_verified_at: "2026-01-01" },
    }),
  }),
}));

describe("POST /api/auth/verify/confirm", () => {
  it("proxies the token and returns the updated user", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/verify/confirm", {
      method: "POST",
      headers: { cookie: "csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ token: "verify-token" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.email_verified_at).toBe("2026-01-01");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test app/api/auth/verify/confirm/route.test.ts`
Expected: FAIL — `./route` not found.

- [ ] **Step 7: Implement `app/api/auth/verify/confirm/route.ts`**

```typescript
// app/api/auth/verify/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const { token } = await request.json();
  const client = createServerApiClient();
  const { data } = await client.post("/auth/verify/confirm", { token });
  return NextResponse.json(data);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test app/api/auth/verify/confirm/route.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/api/auth/verify
git commit -m "feat: add BFF email verification routes"
```

---

## Task 8: Users BFF Routes (profile, password, deactivate, delete)

**Files:**
- Create: `app/api/users/me/route.ts`
- Create: `app/api/users/me/password/route.ts`
- Create: `app/api/users/me/deactivate/route.ts`
- Create: `app/api/users/me/delete/route.ts`
- Create: `app/api/users/me/delete/cancel/route.ts`
- Test: `app/api/users/me/route.test.ts`
- Test: `app/api/users/me/password/route.test.ts`

**Interfaces:**
- Consumes: `createServerApiClient` (Task 4), `getAccessToken` (Task 3), `verifyCsrfToken` (Task 3), `UpdateProfilePayload`/`ChangePasswordPayload`/`UserProfileResponse` (Task 2).
- Produces: `GET/PATCH /api/users/me`, `POST /api/users/me/password`, `POST /api/users/me/deactivate`, `POST /api/users/me/delete`, `POST /api/users/me/delete/cancel` — consumed by `lib/api/users.ts` (Task 9).

- [ ] **Step 1: Write failing test for GET/PATCH `users/me`**

```typescript
// app/api/users/me/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const profile = {
  id: "1",
  email: "a@b.com",
  username: "a",
  display_name: "A",
  bio: null,
  avatar_url: null,
  locale: "en",
  timezone: "UTC",
  is_active: true,
  is_admin: false,
  deletion_scheduled_at: null,
};

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    get: vi.fn().mockResolvedValue({ data: profile }),
    patch: vi.fn().mockResolvedValue({ data: { ...profile, display_name: "Updated" } }),
  }),
}));

describe("GET /api/users/me", () => {
  it("returns the profile", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      headers: { cookie: "access_token=at" },
    });
    const response = await GET(request);
    const body = await response.json();
    expect(body.username).toBe("a");
  });
});

describe("PATCH /api/users/me", () => {
  it("returns 403 without CSRF header", async () => {
    const { PATCH } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      method: "PATCH",
      headers: { cookie: "access_token=at; csrf_token=abc" },
      body: JSON.stringify({ display_name: "Updated" }),
    });
    const response = await PATCH(request);
    expect(response.status).toBe(403);
  });

  it("proxies the update with matching CSRF header", async () => {
    const { PATCH } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      method: "PATCH",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ display_name: "Updated" }),
    });
    const response = await PATCH(request);
    const body = await response.json();
    expect(body.display_name).toBe("Updated");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test app/api/users/me/route.test.ts`
Expected: FAIL — `./route` not found.

- [ ] **Step 3: Implement `app/api/users/me/route.ts`**

```typescript
// app/api/users/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";
import type { UpdateProfilePayload } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  const { data } = await client.get("/users/me");
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const payload: UpdateProfilePayload = await request.json();
  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  const { data } = await client.patch("/users/me", payload);
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test app/api/users/me/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write failing test for password route**

```typescript
// app/api/users/me/password/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post: vi.fn().mockResolvedValue({}) }),
}));

describe("POST /api/users/me/password", () => {
  it("returns 403 without CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/password", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc" },
      body: JSON.stringify({ current_password: "old", new_password: "new" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("returns 204 with matching CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/password", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ current_password: "old", new_password: "new" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(204);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test app/api/users/me/password/route.test.ts`
Expected: FAIL — `./route` not found.

- [ ] **Step 7: Implement `app/api/users/me/password/route.ts`**

```typescript
// app/api/users/me/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";
import type { ChangePasswordPayload } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const payload: ChangePasswordPayload = await request.json();
  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  await client.post("/users/me/password", payload);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test app/api/users/me/password/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Implement the remaining three routes (deactivate, delete, delete/cancel) — same CSRF-gate + proxy shape, no request body**

```typescript
// app/api/users/me/deactivate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  const { data } = await client.post("/users/me/deactivate");
  return NextResponse.json(data);
}
```

```typescript
// app/api/users/me/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  const { data } = await client.post("/users/me/delete");
  return NextResponse.json(data);
}
```

```typescript
// app/api/users/me/delete/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerApiClient } from "@/lib/api/server-client";
import { getAccessToken } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const csrfCookie = request.cookies.get("csrf_token")?.value;
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!verifyCsrfToken(csrfCookie, csrfHeader)) {
    return NextResponse.json({ detail: "Invalid CSRF token" }, { status: 403 });
  }

  const accessToken = getAccessToken(request);
  const client = createServerApiClient(accessToken);
  const { data } = await client.post("/users/me/delete/cancel");
  return NextResponse.json(data);
}
```

- [ ] **Step 10: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add app/api/users
git commit -m "feat: add BFF users routes (profile, password, deactivate, delete)"
```

---

## Task 9: Typed API Modules

**Files:**
- Create: `lib/api/auth.ts`
- Create: `lib/api/users.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 5), types from `lib/api/types.ts` (Task 2).
- Produces: `registerUser`, `loginUser`, `logoutUser`, `requestEmailVerification`, `confirmEmailVerification`, `fetchMe` from `auth.ts`; `fetchProfile`, `updateProfile`, `changePassword`, `deactivateAccount`, `scheduleDeletion`, `cancelDeletion` from `users.ts` — consumed by `hooks/useAuth.ts`, `hooks/useMe.ts`, `hooks/useProfile.ts` (Tasks 10-12).

- [ ] **Step 1: Implement `lib/api/auth.ts`**

```typescript
// lib/api/auth.ts
import { apiClient } from "./client";
import type { LoginPayload, RegisterPayload, UserResponse } from "./types";

export async function registerUser(payload: RegisterPayload): Promise<{ user: UserResponse }> {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<{ user: UserResponse }> {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function requestEmailVerification(): Promise<void> {
  await apiClient.post("/auth/verify/request");
}

export async function confirmEmailVerification(token: string): Promise<UserResponse> {
  const { data } = await apiClient.post("/auth/verify/confirm", { token });
  return data;
}
```

- [ ] **Step 2: Implement `lib/api/users.ts`**

```typescript
// lib/api/users.ts
import { apiClient } from "./client";
import type { ChangePasswordPayload, UpdateProfilePayload, UserProfileResponse } from "./types";

export async function fetchProfile(): Promise<UserProfileResponse> {
  const { data } = await apiClient.get("/users/me");
  return data;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfileResponse> {
  const { data } = await apiClient.patch("/users/me", payload);
  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post("/users/me/password", payload);
}

export async function deactivateAccount(): Promise<UserProfileResponse> {
  const { data } = await apiClient.post("/users/me/deactivate");
  return data;
}

export async function scheduleDeletion(): Promise<UserProfileResponse> {
  const { data } = await apiClient.post("/users/me/delete");
  return data;
}

export async function cancelDeletion(): Promise<UserProfileResponse> {
  const { data } = await apiClient.post("/users/me/delete/cancel");
  return data;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/auth.ts lib/api/users.ts
git commit -m "feat: add typed auth and users API modules"
```

---

## Task 10: QueryClientProvider Wiring

**Files:**
- Create: `lib/query-client.tsx`
- Modify: `app/layout.tsx`
- Test: `lib/query-client.test.tsx`

**Interfaces:**
- Produces: `AppQueryProvider` component — consumed by `app/layout.tsx` and every test that renders a hook-using component.

- [ ] **Step 1: Write failing test**

```typescript
// lib/query-client.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppQueryProvider } from "./query-client";

describe("AppQueryProvider", () => {
  it("renders children", () => {
    render(
      <AppQueryProvider>
        <div>child content</div>
      </AppQueryProvider>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/query-client.test.tsx`
Expected: FAIL — `./query-client` not found.

- [ ] **Step 3: Implement `lib/query-client.tsx`**

```typescript
// lib/query-client.tsx
"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/query-client.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into `app/layout.tsx`**

Modify `app/layout.tsx`: import `AppQueryProvider` and wrap the existing `ThemeProvider` children.

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookworm Hole",
  description: "Track, review, and discover books.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <AppQueryProvider>{children}</AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Run full test suite to confirm nothing broke**

Run: `pnpm test`
Expected: all existing + new tests PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/query-client.tsx lib/query-client.test.tsx app/layout.tsx
git commit -m "feat: wire TanStack QueryClientProvider into root layout"
```

---

## Task 11: msw Test Mocks

**Files:**
- Create: `tests/mocks/handlers.ts`
- Create: `tests/mocks/server.ts`
- Modify: `tests/setup.ts`

**Interfaces:**
- Produces: `handlers` array, `server` (msw `SetupServer`) — consumed by every hook test in Tasks 12-13 and every form component test in Tasks 14-16.

- [ ] **Step 1: Implement `tests/mocks/handlers.ts`**

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from "msw";

const profile = {
  id: "1",
  email: "a@b.com",
  username: "alice",
  display_name: "Alice",
  bio: null,
  avatar_url: null,
  locale: "en",
  timezone: "UTC",
  is_active: true,
  is_admin: false,
  deletion_scheduled_at: null,
};

export const handlers = [
  http.post("/api/auth/register", () =>
    HttpResponse.json({ user: { ...profile, email_verified_at: null } }, { status: 201 }),
  ),
  http.post("/api/auth/login", () =>
    HttpResponse.json({ user: { ...profile, email_verified_at: null } }),
  ),
  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/auth/verify/request", () => new HttpResponse(null, { status: 202 })),
  http.post("/api/auth/verify/confirm", () =>
    HttpResponse.json({ ...profile, email_verified_at: "2026-01-01T00:00:00Z" }),
  ),
  http.get("/api/users/me", () => HttpResponse.json(profile)),
  http.patch("/api/users/me", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...profile, ...body });
  }),
  http.post("/api/users/me/password", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/users/me/deactivate", () =>
    HttpResponse.json({ ...profile, is_active: false }),
  ),
  http.post("/api/users/me/delete", () =>
    HttpResponse.json({ ...profile, deletion_scheduled_at: "2026-08-18T00:00:00Z" }),
  ),
  http.post("/api/users/me/delete/cancel", () =>
    HttpResponse.json({ ...profile, deletion_scheduled_at: null }),
  ),
];
```

- [ ] **Step 2: Implement `tests/mocks/server.ts`**

```typescript
// tests/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

- [ ] **Step 3: Wire into `tests/setup.ts`**

```typescript
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// jsdom does not implement window.matchMedia. next-themes (and any
// prefers-color-scheme-aware code) calls it on mount, so polyfill it here
// for every test.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: all existing tests still PASS (msw server intercepts nothing they don't call).

- [ ] **Step 5: Commit**

```bash
git add tests/mocks tests/setup.ts
git commit -m "test: add msw handlers for BFF auth/users routes"
```

---

## Task 12: `useAuth` and `useMe` Hooks

**Files:**
- Create: `hooks/useAuth.ts`
- Create: `hooks/useMe.ts`
- Test: `hooks/useAuth.test.tsx`
- Test: `hooks/useMe.test.tsx`

**Interfaces:**
- Consumes: `registerUser`/`loginUser`/`logoutUser`/`requestEmailVerification`/`confirmEmailVerification` (Task 9), `fetchProfile`... no — `useMe` calls `apiClient.get("/auth/me")` conceptually but the spec routes profile reads through `users/me`; use `fetchProfile` from `lib/api/users.ts` for `useMe` since it's the richer shape the header/profile page needs. `AppQueryProvider` (Task 10) for tests.
- Produces: `useRegister()`, `useLogin()`, `useLogout()`, `useRequestEmailVerification()`, `useConfirmEmailVerification()` from `useAuth.ts`; `useMe()` from `useMe.ts` — consumed by `components/auth/*` (Task 14) and `components/shell/header.tsx` (Task 17).

- [ ] **Step 1: Write failing test for `useMe`**

```typescript
// hooks/useMe.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AppQueryProvider } from "@/lib/query-client";
import { useMe } from "./useMe";

describe("useMe", () => {
  it("fetches the current user profile", async () => {
    const { result } = renderHook(() => useMe(), { wrapper: AppQueryProvider });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.username).toBe("alice");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test hooks/useMe.test.tsx`
Expected: FAIL — `./useMe` not found.

- [ ] **Step 3: Implement `hooks/useMe.ts`**

```typescript
// hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/api/users";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchProfile,
    retry: false,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test hooks/useMe.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write failing test for `useAuth`**

```typescript
// hooks/useAuth.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AppQueryProvider } from "@/lib/query-client";
import { useLogin, useLogout, useRegister } from "./useAuth";

describe("useAuth", () => {
  it("useRegister calls the register endpoint and resolves the user", async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: AppQueryProvider });
    result.current.mutate({
      email: "a@b.com",
      username: "alice",
      password: "pw",
      display_name: "Alice",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user.username).toBe("alice");
  });

  it("useLogin calls the login endpoint and resolves the user", async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: AppQueryProvider });
    result.current.mutate({ email: "a@b.com", password: "pw" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user.username).toBe("alice");
  });

  it("useLogout resolves without error", async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test hooks/useAuth.test.tsx`
Expected: FAIL — `./useAuth` not found.

- [ ] **Step 7: Implement `hooks/useAuth.ts`**

```typescript
// hooks/useAuth.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  confirmEmailVerification,
  loginUser,
  logoutUser,
  registerUser,
  requestEmailVerification,
} from "@/lib/api/auth";

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => queryClient.removeQueries({ queryKey: ["me"] }),
  });
}

export function useRequestEmailVerification() {
  return useMutation({ mutationFn: requestEmailVerification });
}

export function useConfirmEmailVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmEmailVerification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test hooks/useAuth.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add hooks/useAuth.ts hooks/useAuth.test.tsx hooks/useMe.ts hooks/useMe.test.tsx
git commit -m "feat: add useAuth and useMe TanStack Query hooks"
```

---

## Task 13: `useProfile` Hook

**Files:**
- Create: `hooks/useProfile.ts`
- Test: `hooks/useProfile.test.tsx`

**Interfaces:**
- Consumes: `updateProfile`/`changePassword`/`deactivateAccount`/`scheduleDeletion`/`cancelDeletion` (Task 9).
- Produces: `useUpdateProfile()`, `useChangePassword()`, `useDeactivateAccount()`, `useScheduleDeletion()`, `useCancelDeletion()` — consumed by `components/profile/*` (Task 15-16).

- [ ] **Step 1: Write failing test**

```typescript
// hooks/useProfile.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AppQueryProvider } from "@/lib/query-client";
import {
  useCancelDeletion,
  useChangePassword,
  useDeactivateAccount,
  useScheduleDeletion,
  useUpdateProfile,
} from "./useProfile";

describe("useProfile", () => {
  it("useUpdateProfile resolves the updated profile", async () => {
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: AppQueryProvider });
    result.current.mutate({ display_name: "New Name" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.display_name).toBe("New Name");
  });

  it("useChangePassword resolves without error", async () => {
    const { result } = renderHook(() => useChangePassword(), { wrapper: AppQueryProvider });
    result.current.mutate({ current_password: "old", new_password: "new" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useScheduleDeletion sets deletion_scheduled_at", async () => {
    const { result } = renderHook(() => useScheduleDeletion(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deletion_scheduled_at).toBeTruthy();
  });

  it("useCancelDeletion clears deletion_scheduled_at", async () => {
    const { result } = renderHook(() => useCancelDeletion(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deletion_scheduled_at).toBeNull();
  });

  it("useDeactivateAccount sets is_active to false", async () => {
    const { result } = renderHook(() => useDeactivateAccount(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.is_active).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test hooks/useProfile.test.tsx`
Expected: FAIL — `./useProfile` not found.

- [ ] **Step 3: Implement `hooks/useProfile.ts`**

```typescript
// hooks/useProfile.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelDeletion,
  changePassword,
  deactivateAccount,
  scheduleDeletion,
  updateProfile,
} from "@/lib/api/users";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}

export function useDeactivateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateAccount,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useScheduleDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scheduleDeletion,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useCancelDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelDeletion,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test hooks/useProfile.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useProfile.ts hooks/useProfile.test.tsx
git commit -m "feat: add useProfile TanStack Query hooks"
```

---

## Task 14: Auth Form Components (Login, Register, Verification Banner)

**Files:**
- Create: `components/auth/login-form.tsx`
- Create: `components/auth/login-form.stories.tsx`
- Create: `components/auth/login-form.test.tsx`
- Create: `components/auth/register-form.tsx`
- Create: `components/auth/register-form.stories.tsx`
- Create: `components/auth/register-form.test.tsx`
- Create: `components/auth/email-verification-banner.tsx`
- Create: `components/auth/email-verification-banner.stories.tsx`
- Create: `components/auth/email-verification-banner.test.tsx`

**Interfaces:**
- Consumes: `useLogin`/`useRegister`/`useRequestEmailVerification` (Task 12), `Button`/`Input`/`Card` from `components/ui/*` (Block 0), `AppQueryProvider` (Task 10) for stories/tests.
- Produces: `LoginForm`, `RegisterForm`, `EmailVerificationBanner` — consumed by `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(app)/profile/page.tsx` (Task 18).

- [ ] **Step 1: Write failing test for `LoginForm`**

```typescript
// components/auth/login-form.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("submits email and password and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    render(
      <AppQueryProvider>
        <LoginForm onSuccess={onSuccess} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows a form-level error on failed login", async () => {
    const { server } = await import("@/tests/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 }),
      ),
    );

    render(
      <AppQueryProvider>
        <LoginForm onSuccess={vi.fn()} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/auth/login-form.test.tsx`
Expected: FAIL — `./login-form` not found.

- [ ] **Step 3: Implement `components/auth/login-form.tsx`**

```typescript
// components/auth/login-form.tsx
"use client";

import * as React from "react";
import { useLogin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function extractErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data
      ?.detail === "string"
  ) {
    return (error as { response: { data: { detail: string } } }).response.data.detail;
  }
  return "Something went wrong. Please try again.";
}

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const login = useLogin();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => onSuccess(),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {login.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(login.error)}</p>
      )}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? "Logging in..." : "Log in"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Fix the label association — `Input` from Block 0 may not forward `id` to a native input directly; verify**

Run: `pnpm test components/auth/login-form.test.tsx`
Expected: if `getByLabelText` fails, check `components/ui/input.tsx` renders `<input>` with `id`/`aria-*` passthrough (it does, per Block 0's shadcn scaffold — `InputPrimitive.Props` spreads onto a native input). PASS expected as written.

- [ ] **Step 5: Write the Storybook story**

```typescript
// components/auth/login-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { LoginForm } from "./login-form";

const meta: Meta<typeof LoginForm> = {
  title: "Auth/LoginForm",
  component: LoginForm,
  decorators: [(Story) => <AppQueryProvider><Story /></AppQueryProvider>],
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: { onSuccess: () => {} },
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test components/auth/login-form.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Write failing test for `RegisterForm`**

```typescript
// components/auth/register-form.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
  it("submits all fields and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    render(
      <AppQueryProvider>
        <RegisterForm onSuccess={onSuccess} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Display name"), "Alice");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows a form-level error on failed registration", async () => {
    const { server } = await import("@/tests/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post("/api/auth/register", () =>
        HttpResponse.json({ detail: "Email already registered" }, { status: 409 }),
      ),
    );

    render(
      <AppQueryProvider>
        <RegisterForm onSuccess={vi.fn()} />
      </AppQueryProvider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Username"), "alice");
    await userEvent.type(screen.getByLabelText("Display name"), "Alice");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `pnpm test components/auth/register-form.test.tsx`
Expected: FAIL — `./register-form` not found.

- [ ] **Step 9: Implement `components/auth/register-form.tsx`**

```typescript
// components/auth/register-form.tsx
"use client";

import * as React from "react";
import { useRegister } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function extractErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data
      ?.detail === "string"
  ) {
    return (error as { response: { data: { detail: string } } }).response.data.detail;
  }
  return "Something went wrong. Please try again.";
}

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const register = useRegister();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    register.mutate(
      { email, username, display_name: displayName, password },
      { onSuccess: () => onSuccess() },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="register-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-display-name" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="register-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {register.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(register.error)}</p>
      )}
      <Button type="submit" disabled={register.isPending}>
        {register.isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 10: Write the Storybook story**

```typescript
// components/auth/register-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { RegisterForm } from "./register-form";

const meta: Meta<typeof RegisterForm> = {
  title: "Auth/RegisterForm",
  component: RegisterForm,
  decorators: [(Story) => <AppQueryProvider><Story /></AppQueryProvider>],
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {
  args: { onSuccess: () => {} },
};
```

- [ ] **Step 11: Run test to verify it passes**

Run: `pnpm test components/auth/register-form.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 12: Write failing test for `EmailVerificationBanner`**

```typescript
// components/auth/email-verification-banner.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { EmailVerificationBanner } from "./email-verification-banner";

describe("EmailVerificationBanner", () => {
  it("does not render when the email is already verified", () => {
    render(
      <AppQueryProvider>
        <EmailVerificationBanner emailVerifiedAt="2026-01-01T00:00:00Z" />
      </AppQueryProvider>,
    );
    expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
  });

  it("renders a resend button when unverified, and shows a sent confirmation on click", async () => {
    render(
      <AppQueryProvider>
        <EmailVerificationBanner emailVerifiedAt={null} />
      </AppQueryProvider>,
    );
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 13: Run test to verify it fails**

Run: `pnpm test components/auth/email-verification-banner.test.tsx`
Expected: FAIL — `./email-verification-banner` not found.

- [ ] **Step 14: Implement `components/auth/email-verification-banner.tsx`**

```typescript
// components/auth/email-verification-banner.tsx
"use client";

import { useRequestEmailVerification } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner({
  emailVerifiedAt,
}: {
  emailVerifiedAt: string | null;
}) {
  const requestVerification = useRequestEmailVerification();

  if (emailVerifiedAt) return null;

  return (
    <div className="bg-muted flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm">
      <span>Please verify your email address.</span>
      {requestVerification.isSuccess ? (
        <span className="text-muted-foreground">Verification email sent.</span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={requestVerification.isPending}
          onClick={() => requestVerification.mutate()}
        >
          Resend verification email
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 15: Write the Storybook story**

```typescript
// components/auth/email-verification-banner.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { EmailVerificationBanner } from "./email-verification-banner";

const meta: Meta<typeof EmailVerificationBanner> = {
  title: "Auth/EmailVerificationBanner",
  component: EmailVerificationBanner,
  decorators: [(Story) => <AppQueryProvider><Story /></AppQueryProvider>],
};

export default meta;
type Story = StoryObj<typeof EmailVerificationBanner>;

export const Unverified: Story = {
  args: { emailVerifiedAt: null },
};

export const Verified: Story = {
  args: { emailVerifiedAt: "2026-01-01T00:00:00Z" },
};
```

- [ ] **Step 16: Run test to verify it passes**

Run: `pnpm test components/auth/email-verification-banner.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 17: Commit**

```bash
git add components/auth
git commit -m "feat: add LoginForm, RegisterForm, EmailVerificationBanner components"
```

---

## Task 15: Profile Form Components (Profile, Change Password)

**Files:**
- Create: `components/profile/profile-form.tsx`
- Create: `components/profile/profile-form.stories.tsx`
- Create: `components/profile/profile-form.test.tsx`
- Create: `components/profile/change-password-form.tsx`
- Create: `components/profile/change-password-form.stories.tsx`
- Create: `components/profile/change-password-form.test.tsx`

**Interfaces:**
- Consumes: `useUpdateProfile`/`useChangePassword` (Task 13), `UserProfileResponse` (Task 2), `Button`/`Input`/`Textarea` (Block 0).
- Produces: `ProfileForm`, `ChangePasswordForm` — consumed by `app/(app)/profile/page.tsx` (Task 18).

- [ ] **Step 1: Write failing test for `ProfileForm`**

```typescript
// components/profile/profile-form.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { ProfileForm } from "./profile-form";

const profile = {
  id: "1",
  email: "a@b.com",
  username: "alice",
  display_name: "Alice",
  bio: null,
  avatar_url: null,
  locale: "en",
  timezone: "UTC",
  is_active: true,
  is_admin: false,
  deletion_scheduled_at: null,
};

describe("ProfileForm", () => {
  it("pre-fills fields from the current profile", () => {
    render(
      <AppQueryProvider>
        <ProfileForm profile={profile} />
      </AppQueryProvider>,
    );
    expect(screen.getByLabelText("Display name")).toHaveValue("Alice");
  });

  it("submits updated display name and shows a saved confirmation", async () => {
    render(
      <AppQueryProvider>
        <ProfileForm profile={profile} />
      </AppQueryProvider>,
    );
    const displayNameInput = screen.getByLabelText("Display name");
    await userEvent.clear(displayNameInput);
    await userEvent.type(displayNameInput, "New Name");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/profile updated/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/profile/profile-form.test.tsx`
Expected: FAIL — `./profile-form` not found.

- [ ] **Step 3: Implement `components/profile/profile-form.tsx`**

```typescript
// components/profile/profile-form.tsx
"use client";

import * as React from "react";
import { useUpdateProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UserProfileResponse } from "@/lib/api/types";

export function ProfileForm({ profile }: { profile: UserProfileResponse }) {
  const [displayName, setDisplayName] = React.useState(profile.display_name);
  const [bio, setBio] = React.useState(profile.bio ?? "");
  const updateProfile = useUpdateProfile();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateProfile.mutate({ display_name: displayName, bio });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-display-name" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="profile-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-bio" className="text-sm font-medium">
          Bio
        </label>
        <Textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      {updateProfile.isSuccess && (
        <p className="text-muted-foreground text-sm">Profile updated.</p>
      )}
      <Button type="submit" disabled={updateProfile.isPending} className="self-start">
        {updateProfile.isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Write the Storybook story**

```typescript
// components/profile/profile-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { ProfileForm } from "./profile-form";

const meta: Meta<typeof ProfileForm> = {
  title: "Profile/ProfileForm",
  component: ProfileForm,
  decorators: [(Story) => <AppQueryProvider><Story /></AppQueryProvider>],
};

export default meta;
type Story = StoryObj<typeof ProfileForm>;

export const Default: Story = {
  args: {
    profile: {
      id: "1",
      email: "a@b.com",
      username: "alice",
      display_name: "Alice",
      bio: "Book lover.",
      avatar_url: null,
      locale: "en",
      timezone: "UTC",
      is_active: true,
      is_admin: false,
      deletion_scheduled_at: null,
    },
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test components/profile/profile-form.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Write failing test for `ChangePasswordForm`**

```typescript
// components/profile/change-password-form.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { ChangePasswordForm } from "./change-password-form";

describe("ChangePasswordForm", () => {
  it("submits current and new password, shows success message, clears fields", async () => {
    render(
      <AppQueryProvider>
        <ChangePasswordForm />
      </AppQueryProvider>,
    );
    await userEvent.type(screen.getByLabelText("Current password"), "old-pw");
    await userEvent.type(screen.getByLabelText("New password"), "new-pw-123");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm test components/profile/change-password-form.test.tsx`
Expected: FAIL — `./change-password-form` not found.

- [ ] **Step 8: Implement `components/profile/change-password-form.tsx`**

```typescript
// components/profile/change-password-form.tsx
"use client";

import * as React from "react";
import { useChangePassword } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const changePassword = useChangePassword();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current-password" className="text-sm font-medium">
          Current password
        </label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      {changePassword.isSuccess && (
        <p className="text-muted-foreground text-sm">Password changed.</p>
      )}
      {changePassword.isError && (
        <p className="text-destructive text-sm">Current password is incorrect.</p>
      )}
      <Button type="submit" disabled={changePassword.isPending} className="self-start">
        {changePassword.isPending ? "Changing..." : "Change password"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 9: Write the Storybook story**

```typescript
// components/profile/change-password-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { ChangePasswordForm } from "./change-password-form";

const meta: Meta<typeof ChangePasswordForm> = {
  title: "Profile/ChangePasswordForm",
  component: ChangePasswordForm,
  decorators: [(Story) => <AppQueryProvider><Story /></AppQueryProvider>],
};

export default meta;
type Story = StoryObj<typeof ChangePasswordForm>;

export const Default: Story = {};
```

- [ ] **Step 10: Run test to verify it passes**

Run: `pnpm test components/profile/change-password-form.test.tsx`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add components/profile/profile-form.tsx components/profile/profile-form.stories.tsx components/profile/profile-form.test.tsx components/profile/change-password-form.tsx components/profile/change-password-form.stories.tsx components/profile/change-password-form.test.tsx
git commit -m "feat: add ProfileForm and ChangePasswordForm components"
```

---

## Task 16: Delete Account Section

**Files:**
- Create: `components/profile/delete-account-section.tsx`
- Create: `components/profile/delete-account-section.stories.tsx`
- Create: `components/profile/delete-account-section.test.tsx`

**Interfaces:**
- Consumes: `useScheduleDeletion`/`useCancelDeletion`/`useDeactivateAccount` (Task 13), `Dialog`/`Button` (Block 0).
- Produces: `DeleteAccountSection` — consumed by `app/(app)/profile/page.tsx` (Task 18).

- [ ] **Step 1: Write failing test**

```typescript
// components/profile/delete-account-section.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { DeleteAccountSection } from "./delete-account-section";

describe("DeleteAccountSection", () => {
  it("shows a delete button and confirm dialog when not scheduled for deletion", async () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt={null} />
      </AppQueryProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("button", { name: "Confirm deletion" })).toBeInTheDocument();
  });

  it("schedules deletion and shows the scheduled date with a cancel button", async () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt={null} />
      </AppQueryProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    expect(await screen.findByText(/scheduled for deletion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeInTheDocument();
  });

  it("shows scheduled state directly when deletionScheduledAt is set", () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt="2026-08-18T00:00:00Z" />
      </AppQueryProvider>,
    );
    expect(screen.getByText(/scheduled for deletion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeInTheDocument();
  });

  it("cancels a scheduled deletion", async () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt="2026-08-18T00:00:00Z" />
      </AppQueryProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));
    expect(await screen.findByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/profile/delete-account-section.test.tsx`
Expected: FAIL — `./delete-account-section` not found.

- [ ] **Step 3: Implement `components/profile/delete-account-section.tsx`**

```typescript
// components/profile/delete-account-section.tsx
"use client";

import * as React from "react";
import { useCancelDeletion, useScheduleDeletion } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteAccountSection({
  deletionScheduledAt,
}: {
  deletionScheduledAt: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const scheduleDeletion = useScheduleDeletion();
  const cancelDeletion = useCancelDeletion();

  const scheduledAt = scheduleDeletion.data?.deletion_scheduled_at ?? deletionScheduledAt;
  const isScheduled = Boolean(scheduledAt) && !cancelDeletion.isSuccess;

  if (isScheduled) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Your account is scheduled for deletion on{" "}
          {new Date(scheduledAt as string).toLocaleDateString()}.
        </p>
        <Button
          variant="outline"
          className="self-start"
          disabled={cancelDeletion.isPending}
          onClick={() => cancelDeletion.mutate()}
        >
          Cancel deletion
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Delete account</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your account will be scheduled for deletion and permanently removed after a 30-day
            grace period. You can cancel any time before then.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={scheduleDeletion.isPending}
            onClick={() => {
              scheduleDeletion.mutate(undefined, { onSuccess: () => setOpen(false) });
            }}
          >
            Confirm deletion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Write the Storybook story**

```typescript
// components/profile/delete-account-section.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { DeleteAccountSection } from "./delete-account-section";

const meta: Meta<typeof DeleteAccountSection> = {
  title: "Profile/DeleteAccountSection",
  component: DeleteAccountSection,
  decorators: [(Story) => <AppQueryProvider><Story /></AppQueryProvider>],
};

export default meta;
type Story = StoryObj<typeof DeleteAccountSection>;

export const NotScheduled: Story = {
  args: { deletionScheduledAt: null },
};

export const Scheduled: Story = {
  args: { deletionScheduledAt: "2026-08-18T00:00:00Z" },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test components/profile/delete-account-section.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add components/profile/delete-account-section.tsx components/profile/delete-account-section.stories.tsx components/profile/delete-account-section.test.tsx
git commit -m "feat: add DeleteAccountSection with schedule/cancel flow"
```

---

## Task 17: Header Auth State

**Files:**
- Modify: `components/shell/header.tsx`
- Modify: `components/shell/header.test.tsx`
- Modify: `components/shell/header.stories.tsx`

**Interfaces:**
- Consumes: `useMe` (Task 12), `useLogout` (Task 12), `DropdownMenu`/`Avatar` (Block 0).
- Produces: updated `Header` — consumed by `components/shell/app-shell.tsx` (unchanged) and every page rendering the shell.

- [ ] **Step 1: Update failing test expectations first**

```typescript
// components/shell/header.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";
import { Header } from "./header";

function renderHeader() {
  return render(
    <ThemeProvider>
      <AppQueryProvider>
        <Header />
      </AppQueryProvider>
    </ThemeProvider>,
  );
}

describe("Header", () => {
  it("renders the logo link", () => {
    renderHeader();
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
  });

  it("shows a Sign in link when there is no session", async () => {
    const { server } = await import("@/tests/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(http.get("/api/users/me", () => HttpResponse.json({}, { status: 401 })));

    renderHeader();
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows a user menu with the display name when a session exists", async () => {
    renderHeader();
    expect(await screen.findByRole("button", { name: /Alice/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test components/shell/header.test.tsx`
Expected: FAIL — no "Sign in" link (currently a static "Sign in" `Button`, not a link, and no user-menu branch).

- [ ] **Step 3: Implement updated `components/shell/header.tsx`**

```typescript
// components/shell/header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useMe } from "@/hooks/useMe";
import { useLogout } from "@/hooks/useAuth";

export function Header() {
  const { data: me } = useMe();
  const logout = useLogout();

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
        {me ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback>{me.display_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {me.display_name}
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout.mutate()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" render={<Link href="/login" />}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Check `components/ui/avatar.tsx` and `components/ui/dropdown-menu.tsx` exports match the names used above**

Run: `grep -n "^export" components/ui/avatar.tsx components/ui/dropdown-menu.tsx`
Expected: `Avatar`, `AvatarFallback` and `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` all present. If a name differs (e.g. `DropdownMenuTrigger` doesn't accept `render`), adjust to that file's actual `@base-ui` prop pattern (same `render` prop convention as `DialogTrigger` in Task 16 — confirmed in Block 0's `dialog.tsx`).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test components/shell/header.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Update the story to cover both states**

```typescript
// components/shell/header.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";
import { Header } from "./header";

const meta: Meta<typeof Header> = {
  title: "Shell/Header",
  component: Header,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <AppQueryProvider>
          <Story />
        </AppQueryProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const SignedOut: Story = {
  parameters: {
    msw: {
      handlers: [http.get("/api/users/me", () => HttpResponse.json({}, { status: 401 }))],
    },
  },
};

export const SignedIn: Story = {};
```

- [ ] **Step 7: Run full test suite**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add components/shell/header.tsx components/shell/header.test.tsx components/shell/header.stories.tsx
git commit -m "feat: wire real auth state into Header (user menu vs Sign in)"
```

---

## Task 18: Middleware

**Files:**
- Create: `middleware.ts`
- Test: `middleware.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (reads the raw `access_token` cookie directly to keep middleware edge-runtime-safe — no axios import).
- Produces: route protection for the `(app)` group — required before Task 19's `(app)/layout.tsx` can assume a session exists.

- [ ] **Step 1: Write failing test**

```typescript
// middleware.test.ts
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

describe("middleware", () => {
  it("redirects to /login when no access_token cookie is present on an (app) route", () => {
    const request = new NextRequest("http://localhost/profile");
    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("passes through when an access_token cookie is present", () => {
    const request = new NextRequest("http://localhost/profile", {
      headers: { cookie: "access_token=some-token" },
    });
    const response = middleware(request);
    expect(response.status).toBe(200);
  });

  it("passes through auth routes regardless of cookie state", () => {
    const request = new NextRequest("http://localhost/login");
    const response = middleware(request);
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test middleware.test.ts`
Expected: FAIL — `./middleware` not found.

- [ ] **Step 3: Implement `middleware.ts`**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/profile"];

export function middleware(request: NextRequest) {
  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*"],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test middleware.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add middleware.ts middleware.test.ts
git commit -m "feat: add middleware gating (app) routes on access_token cookie"
```

---

## Task 19: Pages — Login, Register, Verify

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/verify/page.tsx`

**Interfaces:**
- Consumes: `LoginForm`/`RegisterForm` (Task 14), `useConfirmEmailVerification` (Task 12).
- Produces: `/login`, `/register`, `/verify` routes.

- [ ] **Step 1: Implement `app/(auth)/layout.tsx`**

```typescript
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `app/(auth)/login/page.tsx`**

```typescript
// app/(auth)/login/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Log in</h1>
      <LoginForm onSuccess={() => router.push("/profile")} />
      <p className="text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Implement `app/(auth)/register/page.tsx`**

```typescript
// app/(auth)/register/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Create an account</h1>
      <RegisterForm onSuccess={() => router.push("/profile")} />
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Implement `app/(auth)/verify/page.tsx`**

```typescript
// app/(auth)/verify/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useConfirmEmailVerification } from "@/hooks/useAuth";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const confirmVerification = useConfirmEmailVerification();

  React.useEffect(() => {
    if (token) {
      confirmVerification.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return <p>Missing verification token.</p>;
  }
  if (confirmVerification.isPending) {
    return <p>Verifying your email...</p>;
  }
  if (confirmVerification.isError) {
    return <p className="text-destructive">This verification link is invalid or expired.</p>;
  }
  return <p>Your email has been verified.</p>;
}
```

- [ ] **Step 5: Run full test suite and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(auth)"
git commit -m "feat: add login, register, and email verification pages"
```

---

## Task 20: App Shell Wiring and Profile Page

**Files:**
- Modify: `app/page.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/profile/page.tsx`

**Interfaces:**
- Consumes: `AppShell` (Block 0), `useMe` (Task 12), `EmailVerificationBanner` (Task 14), `ProfileForm`/`ChangePasswordForm`/`DeleteAccountSection` (Tasks 15-16).
- Produces: real home page using `AppShell`, `/profile` page.

- [ ] **Step 1: Modify `app/page.tsx` to use the Block 0 `AppShell` instead of the create-next-app placeholder**

```typescript
// app/page.tsx
import { AppShell } from "@/components/shell/app-shell";

export default function Home() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Bookworm Hole</h1>
      <p className="text-muted-foreground mt-2">Track, review, and discover books.</p>
    </AppShell>
  );
}
```

- [ ] **Step 2: Implement `app/(app)/layout.tsx`**

```typescript
// app/(app)/layout.tsx
import { AppShell } from "@/components/shell/app-shell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 3: Implement `app/(app)/profile/page.tsx`**

```typescript
// app/(app)/profile/page.tsx
"use client";

import { useMe } from "@/hooks/useMe";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { DeleteAccountSection } from "@/components/profile/delete-account-section";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  const { data: profile, isPending } = useMe();

  if (isPending || !profile) {
    return <p className="text-muted-foreground">Loading profile...</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <EmailVerificationBanner emailVerifiedAt={null} />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountSection deletionScheduledAt={profile.deletion_scheduled_at} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: `UserProfileResponse` has no `email_verified_at` field — fix the banner call to use a value the profile query actually returns**

The spec's `UserProfileResponse` (Task 2) doesn't include `email_verified_at` — only the `auth/me`-shaped `UserResponse` does. Since `useMe` calls `fetchProfile` (`/users/me`), `profile.email_verified_at` does not exist. Options: extend `UserProfileResponse` with `email_verified_at` if the real API's `UserProfileResponse` schema actually includes it, or drop the banner from this page for now.

Check the real schema:

Run: `grep -n "email_verified_at" ../bookworm-hole-api/app/schemas/user_schemas.py`
Expected: no match (confirmed absent from `UserProfileResponse` during spec research).

Since the field genuinely isn't in this response, remove the banner from the profile page rather than fabricate data:

```typescript
// app/(app)/profile/page.tsx (revised — drop EmailVerificationBanner import and usage)
"use client";

import { useMe } from "@/hooks/useMe";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { DeleteAccountSection } from "@/components/profile/delete-account-section";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  const { data: profile, isPending } = useMe();

  if (isPending || !profile) {
    return <p className="text-muted-foreground">Loading profile...</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountSection deletionScheduledAt={profile.deletion_scheduled_at} />
        </CardContent>
      </Card>
    </div>
  );
}
```

`EmailVerificationBanner` (Task 14) stays as a component with its own story/tests (still useful — e.g. Header could show a slim variant later), it's just not mounted on the profile page since there's no field to drive it from `/users/me`. Note this gap for the Block 8 API audit: `UserProfileResponse` might need an `email_verified_at` field so the UI can show verification status outside of the initial `/auth/me` register/login response.

- [ ] **Step 5: Run full test suite and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS, no type errors.

- [ ] **Step 6: Run lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx "app/(app)"
git commit -m "feat: wire AppShell into home page, add authenticated profile page"
```

---

## Task 21: Playwright E2E Happy Path

**Files:**
- Create: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: the live dev server (`pnpm dev`) and — per the spec — the real `bookworm-hole-api` (API#138 already resolved, so this is unblocked). Requires `API_BASE_URL` pointed at a running API instance with a clean DB for test isolation.

- [ ] **Step 1: Implement `e2e/auth.spec.ts`**

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("register, land on profile, log out, log back in", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const email = `e2e-${uniqueSuffix}@example.com`;
  const username = `e2e${uniqueSuffix}`;
  const password = "password123";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("E2E User");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  await page.getByRole("button", { name: /E2E User/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login|\/$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/profile/);
});
```

- [ ] **Step 2: Run the e2e test against a locally running API + dev server**

Run: `pnpm exec playwright test e2e/auth.spec.ts`
Expected: PASS (requires `bookworm-hole-api` running locally per its `Taskfile.yml`/`docker-compose.yaml`, and `.env.local` with `API_BASE_URL` set — document this in the PR description, not committed).

- [ ] **Step 3: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test: add Playwright e2e happy path for register/logout/login"
```

---

## Task 22: Full Gate and PR

**Files:** none (verification only)

- [ ] **Step 1: Check for duplicated logic across the branch**

Task 8's review caught a helper function (`isAxiosError`) copy-pasted identically into 9 route files before extraction to `lib/api/errors.ts`. Before the final gate, scan the whole branch's diff for the same pattern — small helper functions, type guards, or constants repeated verbatim across files instead of imported from one place.

```bash
git diff main...block-1-auth-session -- '*.ts' '*.tsx' | grep -E "^\+.*function [a-zA-Z]+\(" | sort | uniq -c | sort -rn | head -20
```

Expected: no function signature appears more than once (aside from same-named methods with genuinely different bodies, e.g. React component internals). If a duplicate turns up, extract it to a shared module (following the `lib/api/errors.ts` precedent) and re-run the affected tests before proceeding.

- [ ] **Step 2: Run the full gate**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Expected: all commands exit 0.

- [ ] **Step 3: Fix any failures, re-run the gate, and once clean, push and open the PR**

```bash
git push -u origin block-1-auth-session
gh pr create --title "Block 1: Auth & Session" --body "$(cat <<'EOF'
## Summary
- BFF cookie-auth pattern: httpOnly access/refresh token cookies + double-submit CSRF token, set/cleared by Next.js Route Handlers proxying to bookworm-hole-api.
- Register, login, logout, silent refresh, email verification, profile view/edit, change password, deactivate/delete (with cancel) account.
- Header gains real auth state (user menu vs Sign in); middleware gates `/profile`.

## Test plan
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [ ] `pnpm exec playwright test e2e/auth.spec.ts` against a local bookworm-hole-api instance

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** register/login/logout/refresh (Task 6), email verification (Task 7), profile GET/PATCH + password (Task 8), deactivate/schedule-delete/cancel-delete (Task 8), CSRF addendum (Tasks 3, 5-8), header auth state (Task 17), middleware (Task 18), all UI pages (Tasks 19-20), testing strategy incl. msw + Playwright (Tasks 11, 21) — all spec sections have a task.
- **Known gap surfaced during planning (Task 20, Step 4):** `UserProfileResponse` lacks `email_verified_at`, so `EmailVerificationBanner` cannot be data-driven from the profile page today — component ships but isn't mounted; flagged for Block 8 API audit rather than silently worked around.
- **Type consistency:** `UserProfileResponse`/`UpdateProfilePayload`/`ChangePasswordPayload`/`AuthTokens` (Task 2) used identically across `lib/api/*`, `app/api/*`, `hooks/*`, and `components/*` — no renamed fields across tasks.
