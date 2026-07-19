# Block 1 (Auth & Session) — Design

## Purpose

First domain block on top of Block 0's foundation. Covers the `auth` and
`users` (me) API routers: register, login, logout, session refresh, email
verification, profile view/edit, change password, deactivate/delete account.
Establishes the BFF cookie-auth pattern (`lib/api/`, `lib/auth/`,
`hooks/`) every later block reuses.

## API Blocker (resolved)

`POST /auth/register` (and by extension `/auth/login`, `/auth/me`,
`/users/me`) 500'd on a fresh docker-compose DB — `user` table was missing
column `friends_can_see_library` that the ORM model selects on every
query. Filed as
[fedorkovolodymyr/bookworm-hole-api#138](https://github.com/fedorkovolodymyr/bookworm-hole-api/issues/138),
now fixed and closed — re-verified 2026-07-18: register (201), login
(200), `users/me` (200) all return correct schemas against the updated
API. No longer a blocker; implementation and e2e tests can run against
the live API.

## Real API surface (verified against running OpenAPI schema, supersedes original spec wording)

| Endpoint                         | Method | Request                                                                                           | Response                                                                                                                 |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/api/v1/auth/register`          | POST   | `RegisterSchema {email, username, password, display_name}`                                        | `RegisterResponse {user: UserResponse, access_token, refresh_token, token_type}`                                         |
| `/api/v1/auth/login`             | POST   | `LoginSchema {email, password}`                                                                   | `RegisterResponse` (same shape)                                                                                          |
| `/api/v1/auth/refresh`           | POST   | `RefreshRequestSchema {refresh_token}`                                                            | `TokenResponse {access_token, refresh_token, token_type}`                                                                |
| `/api/v1/auth/logout`            | POST   | `RefreshRequestSchema {refresh_token}`                                                            | 204                                                                                                                      |
| `/api/v1/auth/me`                | GET    | — (bearer)                                                                                        | `UserResponse {id, email, username, display_name, is_active, is_admin, email_verified_at}`                               |
| `/api/v1/auth/verify/request`    | POST   | — (bearer)                                                                                        | 204 — sends verification email                                                                                           |
| `/api/v1/auth/verify/confirm`    | POST   | `VerifyEmailConfirmSchema {token}`                                                                | `UserResponse`                                                                                                           |
| `/api/v1/users/me`               | GET    | — (bearer)                                                                                        | `UserProfileResponse` (adds `bio`, `avatar_url`, `locale`, `timezone`, `deletion_scheduled_at` to `UserResponse` fields) |
| `/api/v1/users/me`               | PATCH  | `UpdateUserSchema {display_name?, bio?, avatar_url?, locale?, timezone?}` (all nullable/optional) | `UserProfileResponse`                                                                                                    |
| `/api/v1/users/me/password`      | POST   | `ChangePasswordSchema {current_password, new_password}`                                           | 204                                                                                                                      |
| `/api/v1/users/me/deactivate`    | POST   | — (bearer)                                                                                        | `UserProfileResponse`                                                                                                    |
| `/api/v1/users/me/delete`        | POST   | — (bearer)                                                                                        | `UserProfileResponse` (sets `deletion_scheduled_at`)                                                                     |
| `/api/v1/users/me/delete/cancel` | POST   | — (bearer)                                                                                        | `UserProfileResponse` (clears `deletion_scheduled_at`)                                                                   |

The API itself is stateless bearer-token auth — it does not set cookies.
Cookie wrapping is entirely the UI's BFF responsibility (per Block 0 spec).

## Auth Architecture (BFF cookie pattern)

- `app/api/auth/[action]/route.ts` (or one route file per action) — Next.js
  Route Handlers that proxy to the real API using `API_BASE_URL` (server-
  side env var), then:
  - On register/login success: set `access_token` and `refresh_token` as
    separate httpOnly, `Secure` (prod), `SameSite=Lax` cookies. Access
    token cookie `maxAge` short (matches API's token TTL); refresh token
    cookie longer-lived.
  - On logout: call API `/auth/logout` with the refresh token from the
    cookie, then clear both cookies.
- `middleware.ts` — reads the access-token cookie for routes under
  `(app)`. If missing/expired, attempts silent refresh via the refresh
  route handler; on success, sets new cookies and continues; on failure,
  redirects to `/login`.
- `lib/api/client.ts` — axios instance, `baseURL` = internal BFF routes
  (`/api/auth/...`) for auth actions from client components; a _separate_
  server-only axios instance (`lib/api/server-client.ts`) with
  `Authorization: Bearer <token from cookie>` for route handlers/Server
  Components calling the real API directly (profile GET/PATCH, password
  change, deactivate/delete, verify).
- Response interceptor (client-side axios instance calling BFF routes):
  on 401, one silent retry via refresh, else redirect to `/login`.

## CSRF Protection (addendum, 2026-07-19)

`SameSite=Lax` alone doesn't stop CSRF on cross-site `POST`/`PATCH` requests
issued via forms or fetch with credentials from another origin (`Lax` only
blocks cross-site sub-requests, not top-level navigations/simple `POST`s in
older browser behavior, and offers no defense-in-depth if a future flow
needs `SameSite=None`, e.g. an OAuth redirect). Add a double-submit CSRF
token as a second layer:

- On login/register, the BFF also sets a `csrf_token` cookie: random value,
  **not** httpOnly (client JS must read it), `SameSite=Lax`, `Secure` (prod),
  same lifetime as the access-token cookie.
- `lib/api/client.ts`'s request interceptor reads `csrf_token` from
  `document.cookie` and attaches it as `X-CSRF-Token` on every mutating
  request (`POST`/`PATCH`/`DELETE`) to a BFF route.
- Each BFF route handler that mutates state (login excluded — no session
  yet; register excluded — same; everything past that: logout, refresh,
  profile PATCH, password change, deactivate, delete, delete/cancel, verify
  actions) compares the `X-CSRF-Token` header against the `csrf_token`
  cookie value on the incoming request; mismatch or missing → 403 before
  proxying to the real API.
- No server-side session store needed — the check is a direct
  cookie-vs-header string comparison (standard double-submit pattern).

## UI Surface

- `app/(auth)/login/page.tsx` — email + password form, link to register,
  "forgot password" placeholder (not in scope — no forgot-password
  endpoint exists yet; noted as a gap for Block 8 audit).
- `app/(auth)/register/page.tsx` — email, username, password, display
  name form.
- `app/(app)/profile/page.tsx` — view profile (`UserProfileResponse`
  fields), edit form (PATCH `users/me`), change-password form (separate
  card/section), "Verify email" banner (shown when `email_verified_at` is
  null) triggering `/auth/verify/request`, then a `/verify` confirm page
  reading `?token=` from the URL and calling `/auth/verify/confirm`.
- Delete-account flow: confirm `Dialog` (shadcn, already in Block 0 kit)
  on the profile page → calls `users/me/delete` → shows
  `deletion_scheduled_at` with a "Cancel deletion" button calling
  `users/me/delete/cancel`.
- Deactivate account: a distinct, less-destructive action next to delete
  (confirm dialog, calls `users/me/deactivate`).
- Header (Block 0's `components/shell/header.tsx`) gains real auth state:
  replace the placeholder "Log in" button with a user menu (avatar +
  dropdown: Profile, Log out) when a session exists.

## Data Flow & Error Handling

- `hooks/useAuth.ts` — `useLogin`, `useRegister`, `useLogout` mutations
  (call BFF routes, invalidate `["me"]` query on success).
- `hooks/useMe.ts` — `useMe()` query (`GET /users/me` via server-client
  proxy route `app/api/me/route.ts`, or directly from Server Components).
- `hooks/useProfile.ts` — `useUpdateProfile`, `useChangePassword`,
  `useDeactivateAccount`, `useDeleteAccount`, `useCancelDeleteAccount`
  mutations.
- Field-level validation errors (422 `HTTPValidationError`) surface inline
  per-field under form inputs; other domain errors (401 wrong password,
  409 duplicate email/username) surface as a form-level alert.
- Loading via Query `isPending` + `Skeleton`/disabled-button states from
  Block 0's kit.

## Testing Strategy

- Vitest + RTL: form components (login, register, profile edit, change
  password, delete confirm dialog) — render, validation errors, submit
  calls the right mutation. Mock BFF routes with `msw`.
- Hook tests: mocked API success + error branches for each mutation/query.
- Playwright: one happy-path e2e — register → land on authenticated shell
  → log out → log back in, against the live API (API#138 fixed, no
  longer blocked).
- `middleware.ts` covered by a Vitest test simulating cookie presence/
  absence and refresh success/failure branches.

## Out of Scope (this block)

- Forgot-password / password-reset-via-email — no such endpoint exists in
  the current API surface (only authenticated `users/me/password` change
  exists). Flagged for Block 8 API audit as a potential missing endpoint.
- Admin user management (`admin_users` router) — Block 7.
- Social login / OAuth — not in spec, not in API.
