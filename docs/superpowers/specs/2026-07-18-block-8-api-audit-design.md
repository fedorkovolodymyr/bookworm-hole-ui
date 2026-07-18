# Block 8 (API Audit) — Design

## Purpose

Block 8 is not a UI feature domain — it's a process block. Its job is to
verify, after Blocks 1-7 are implemented, which of `bookworm-hole-api`'s
endpoints the UI actually ended up calling, which existing endpoints turned
out unused, and which shapes/params/endpoints the UI needed but the API
didn't provide. It produces a report that becomes the input for a follow-up
cleanup pass in `bookworm-hole-api` (per the parent spec's "API Audit
Deliverable" section).

Because Blocks 1-7 don't exist yet, this spec has two halves:

1. **Methodology** — a lightweight mechanism, adopted starting with Block 1,
   for each block to self-report which endpoints it consumed, so Block 8
   doesn't have to reverse-engineer usage from scratch later.
2. **Block 8's own deliverable** — what gets done once Blocks 1-7 have
   landed and the running log is populated: cross-reference, gap analysis,
   final report, and a write-up of recommended API changes.

This doc also seeds the running inventory (see "Endpoint Inventory Snapshot"
below) with every endpoint the live API exposes today, mapped to its
planned covering block, so the log has a starting skeleton before Block 1
even begins.

## Methodology: the running endpoint-usage log

**Mechanism:** a single hand-maintained markdown table,
`docs/api-audit/endpoint-usage.md`, living outside `docs/superpowers/specs/`
(specs are point-in-time design docs; this file is a living log that
changes on every block's PR). Block 0's repo structure centralizes all HTTP
calls in `lib/api/<domain>.ts`, so that's the natural place to require an
update alongside the code change — no separate tool needed.

Rejected alternative: a lint rule/script that greps `lib/api/*.ts` for
literal path strings and cross-checks against the OpenAPI manifest. This
would need per-endpoint literal path strings to appear verbatim in client
code (they mostly will, but template-interpolated paths like
`` `/books/${id}/reviews` `` complicate exact matching), and it adds CI
surface (a new script to maintain, a new failure mode to debug) for a
one-time-at-the-end audit. A hand-updated table is simpler, self-documents
*why* an endpoint is used (which page/flow), and the manual-update
discipline is cheap since it's one row added per new `lib/api/` function —
already required by the parent spec's per-block checklist item 6 ("Update
Block 8's running endpoint-usage log with every endpoint consumed this
block"). If the manual log drifts in practice (rows missing, stale), Block
8's audit step (a) below is exactly the safety net that catches it by
diffing against the real OpenAPI surface and the real `lib/api/` source —
so a missed manual update is a caught-late problem, not a silent one.

**Log table shape** (`docs/api-audit/endpoint-usage.md`):

| Endpoint | Method | Used by (block / page or hook) | `lib/api/` fn | Notes |
|---|---|---|---|---|
| `/api/v1/auth/login` | POST | Block 1 — `app/(auth)/login` | `lib/api/auth.ts#login` | via BFF route |
| ... | | | | |

**Update discipline:**

- Every block's implementation plan includes a task (mirroring parent spec
  item 6): "add a row to `docs/api-audit/endpoint-usage.md` for every
  endpoint this block's `lib/api/<domain>.ts` calls."
- The row is added in the same PR as the `lib/api/<domain>.ts` change —
  not deferred — so the log's state always matches merged code, never
  matches in-flight work.
- If a block discovers it needs an endpoint the API doesn't expose (a gap),
  it adds a row to a second table in the same file, **"Gaps — needed but
  missing,"** with columns `desired endpoint | method | why | block`,
  instead of inventing a workaround. This is the direct input to "candidates
  to add" in the parent spec's audit deliverable.
- If a block hits a bug or wrong-shaped response, that's handled by the
  existing `report-api-bug` skill (files a GitHub issue in
  `bookworm-hole-api`, blocks that PR) — Block 8 doesn't duplicate that
  tracking, it aggregates it (see "Block 8 implementation," step (b)).

This keeps Block 8 itself lightweight: by the time it starts, most of the
cross-referencing legwork (which endpoint, which block, which page) is
already recorded incrementally; Block 8 verifies and consolidates rather
than discovering from zero.

## Block 8's own implementation work

Once Blocks 1-7 are merged, Block 8 does:

**(a) Cross-reference usage log against full OpenAPI surface.**
Re-fetch the live OpenAPI schema from the running API (`GET
/api/v1/openapi.json` or equivalent), diff its full path+method list against
`docs/api-audit/endpoint-usage.md`. Any endpoint present in the API but
absent from the log is a candidate "unused" — but first spot-check
`lib/api/*.ts` directly (`grep` for the path fragment) in case the log
missed a manual update; only mark genuinely-uncalled endpoints as
`unused`.

**(b) Review workarounds and filed API bugs.** Search
`fedorkovolodymyr/bookworm-hole-api` issues filed via the `report-api-bug`
skill across Blocks 1-7 (`gh issue list --repo fedorkovolodymyr/bookworm-hole-api
--search "..."`, or by convention/label if one exists). For each: was it
fixed and re-verified (per the skill's step 6), or does it represent a
still-open shape/behavior mismatch that the UI had to route around? Fold
each into the final report as a `change` or `gap` row, referencing the
issue number.

**(c) Produce the final audit report** —
`docs/api-audit/2026-XX-XX-final-audit-report.md` (dated when Block 8 is
actually executed, not today) — with the table shape specified in the
parent spec:

`endpoint | method | used by (block/page) | status (keep/change/unused)`

plus the separate "endpoints UI needed but API doesn't expose" list carried
over from the Gaps table.

**(d) Open a summary issue in `bookworm-hole-api`** (using the same `gh
issue create --repo fedorkovolodymyr/bookworm-hole-api` pattern as
`report-api-bug`, but a single consolidated issue rather than one per bug)
listing recommended additions/changes/removals, linking the final report
and any individual bug issues already filed. This is the handoff artifact
to "a follow-up API-side cleanup pass in `bookworm-hole-api`" per the
parent spec.

Block 8 has no `lib/api/`, `hooks/`, `components/`, or `app/` deliverable —
it produces documentation and (optionally) one API-repo issue, not UI code.
No Storybook/Vitest/Playwright surface applies.

## Endpoint Inventory Snapshot (as of 2026-07-18)

**This table is a snapshot, not a source of truth.** It was generated by
reading the live OpenAPI schema from the running `bookworm-hole-api` docker
instance on 2026-07-18, before any of Blocks 1-7 exist. `status` is
`planned` everywhere (no block has actually called anything yet) — it is
**not** a verified "keep/unused" judgment. By the time Block 8 actually
runs, Blocks 1-7 will have taken months; the API may have shipped new
endpoints, renamed/reshaped existing ones, or removed something listed
here. **Block 8 must re-fetch the live OpenAPI schema and re-derive this
table rather than trusting these rows.** Treat this as a starting skeleton
for `docs/api-audit/endpoint-usage.md`'s covered-endpoints column, seeded
now so Block 1 has something concrete to check off against, not as the
final audit input.

130 endpoint+method pairs total across 20 OpenAPI tags. Grouped by planned
covering block:

### Block 1 — Auth & Session (`auth`, `users`) — 20 endpoints

| Endpoint | Method | Status |
|---|---|---|
| `/api/v1/auth/register` | POST | planned |
| `/api/v1/auth/login` | POST | planned |
| `/api/v1/auth/refresh` | POST | planned |
| `/api/v1/auth/logout` | POST | planned |
| `/api/v1/auth/me` | GET | planned |
| `/api/v1/auth/verify/request` | POST | planned |
| `/api/v1/auth/verify/confirm` | POST | planned |
| `/api/v1/users/me` | GET | planned |
| `/api/v1/users/me` | PATCH | planned |
| `/api/v1/users/me/password` | POST | planned |
| `/api/v1/users/me/deactivate` | POST | planned |
| `/api/v1/users/me/delete` | POST | planned |
| `/api/v1/users/me/delete/cancel` | POST | planned |
| `/api/v1/users/{username}` | GET | planned |
| `/api/v1/users/{user_id}/reviews` | GET | planned — *straddles Block 1 (users) / Block 3 (reviews); confirm owner* |
| `/api/v1/users/me/export/all.json` | GET | planned — *not mentioned in Block 1 spec's UI surface; confirm in scope* |
| `/api/v1/users/me/export/library.csv` | GET | planned — *not mentioned in Block 1 spec; confirm in scope* |
| `/api/v1/users/me/import/bookshelf` | POST | planned — *not mentioned in Block 1 spec; confirm in scope* |
| `/api/v1/users/me/import/csv` | POST | planned — *not mentioned in Block 1 spec; confirm in scope* |
| `/api/v1/users/me/import/goodreads` | POST | planned — *not mentioned in Block 1 spec; confirm in scope* |

Block 1's own spec (read 2026-07-18) only documents 12 of these
(register/login/refresh/logout/me/verify ×2/users-me GET+PATCH/password/
deactivate/delete/delete-cancel). The remaining 8 (public profile lookup,
user reviews, export ×2, import ×3) exist in the live API under the
`users` tag but weren't called out in Block 1's UI surface — flagged here
so Block 8 checks whether they landed under Block 1, got picked up by
another block, or are a genuine gap.

### Block 2 — Catalog (`books`, `releases`, `contributors`, `external`) — 27 endpoints

| Endpoint | Method |
|---|---|
| `GET /api/v1/books/` | |
| `POST /api/v1/books/` | |
| `GET /api/v1/books/by-isbn/{isbn}` | |
| `GET /api/v1/books/{book_id}` | |
| `PATCH /api/v1/books/{book_id}` | |
| `DELETE /api/v1/books/{book_id}` | |
| `POST /api/v1/books/{book_id}/contributors` | |
| `DELETE /api/v1/books/{book_id}/contributors/{contributor_id}` | |
| `GET /api/v1/books/{book_id}/history` | |
| `GET /api/v1/books/{book_id}/history/{version}` | |
| `GET /api/v1/books/{book_id}/reviews` | *straddles Block 2/3 — confirm owner* |
| `POST /api/v1/books/{source_id}/merge-into/{target_id}` | |
| `POST /api/v1/releases/` | |
| `GET /api/v1/releases/{release_id}` | |
| `PATCH /api/v1/releases/{release_id}` | |
| `POST /api/v1/releases/{release_id}/contributors` | |
| `DELETE /api/v1/releases/{release_id}/contributors/{contributor_id}` | |
| `GET /api/v1/releases/{release_id}/history` | |
| `GET /api/v1/releases/{release_id}/history/{version}` | |
| `GET /api/v1/releases/{release_id}/reviews` | *straddles Block 2/3* |
| `GET /api/v1/contributors/` | |
| `POST /api/v1/contributors/` | |
| `GET /api/v1/contributors/{contributor_id}` | |
| `PATCH /api/v1/contributors/{contributor_id}` | |
| `GET /api/v1/contributors/{contributor_id}/books` | |
| `GET /api/v1/contributors/{contributor_id}/history` | |
| `GET /api/v1/contributors/{contributor_id}/history/{version}` | |
| `POST /api/v1/external/import` | |
| `GET /api/v1/external/search` | |

All status `planned`.

### Block 3 — Collections & Reviews (`collections`, `reviews`, `statuses`, `share`) — 24 endpoints

| Endpoint | Method |
|---|---|
| `GET /api/v1/collections/` | |
| `POST /api/v1/collections/` | |
| `GET /api/v1/collections/{collection_id}` | |
| `PATCH /api/v1/collections/{collection_id}` | |
| `DELETE /api/v1/collections/{collection_id}` | |
| `POST /api/v1/collections/{collection_id}/items` | |
| `PATCH /api/v1/collections/{collection_id}/items/{item_id}` | |
| `DELETE /api/v1/collections/{collection_id}/items/{item_id}` | |
| `POST /api/v1/collections/{collection_id}/reorder` | |
| `POST /api/v1/reviews/` | |
| `GET /api/v1/reviews/{review_id}` | |
| `PATCH /api/v1/reviews/{review_id}` | |
| `DELETE /api/v1/reviews/{review_id}` | |
| `GET /api/v1/me/statuses/` | |
| `POST /api/v1/me/statuses/` | |
| `PATCH /api/v1/me/statuses/{status_id}` | |
| `DELETE /api/v1/me/statuses/{status_id}` | |
| `POST /api/v1/me/statuses/{status_id}/lend` | |
| `POST /api/v1/me/statuses/{status_id}/return` | |
| `GET /api/v1/me/library` | |
| `GET /api/v1/me/wishlist` | |
| `GET /api/v1/me/borrowed` | |
| `GET /api/v1/me/lent-out` | |
| `POST /api/v1/share/book/{book_id}` | |
| `POST /api/v1/share/collection/{collection_id}` | |

(24 listed, one more than initial estimate — `share` adds 2.) All `planned`.

### Block 4 — Reading (`reading`, `reading-sessions`) — 7 endpoints

| Endpoint | Method |
|---|---|
| `GET /api/v1/me/reading/active` | |
| `GET /api/v1/me/reading/sessions` | |
| `PATCH /api/v1/me/reading/sessions/{session_id}` | |
| `DELETE /api/v1/me/reading/sessions/{session_id}` | |
| `POST /api/v1/me/reading/start` | |
| `POST /api/v1/me/reading/stop` | |
| `GET /api/v1/me/reading/stats` | |
| `GET /api/v1/me/reading/streak` | |
| `GET /api/v1/me/reading/timeline` | |

(9 rows — parent spec lists `reading_sessions`/`reading_stats`; live API
splits stats into stats/streak/timeline, 3 separate endpoints.) All
`planned`.

### Block 5 — Social (`friends`) — 10 endpoints

| Endpoint | Method |
|---|---|
| `GET /api/v1/friends/` | |
| `POST /api/v1/friends/requests` | |
| `GET /api/v1/friends/requests/incoming` | |
| `GET /api/v1/friends/requests/outgoing` | |
| `POST /api/v1/friends/requests/{friendship_id}/accept` | |
| `POST /api/v1/friends/requests/{friendship_id}/decline` | |
| `DELETE /api/v1/friends/{user_id}` | |
| `POST /api/v1/friends/{user_id}/block` | |
| `DELETE /api/v1/friends/{user_id}/block` | |
| `GET /api/v1/friends/{user_id}/collections` | |
| `GET /api/v1/friends/{user_id}/library` | |

(11 endpoints, one more than initial estimate.) All `planned`.

### Block 6 — AI & Chat (`ai`, `chat`) — 8 endpoints

| Endpoint | Method | Notes |
|---|---|---|
| `POST /api/v1/ai/recommend` | | OpenAPI summary says "Coming soon" — verify it's actually implemented (not a stub) before Block 6 begins |
| `POST /api/v1/ai/summary` | | same "Coming soon" caveat |
| `POST /api/v1/ai/tag-suggest` | | same "Coming soon" caveat |
| `POST /api/v1/chat/threads` | | |
| `GET /api/v1/chat/threads/` | | |
| `GET /api/v1/chat/threads/{thread_id}/messages` | | |
| `POST /api/v1/chat/threads/{thread_id}/messages` | | |
| `POST /api/v1/chat/threads/{thread_id}/read` | | |

All `planned`. The three `ai/*` endpoints' OpenAPI summaries literally read
"Coming soon" — Block 6 should verify these return real responses, not
placeholder 501s, before committing to build UI against them; if still
stubbed, that's a note for Block 8's gap list, not a silent skip.

### Block 7 — Admin (`admin`) — 11 endpoints

| Endpoint | Method |
|---|---|
| `GET /api/v1/admin/audit-logs/` | |
| `GET /api/v1/admin/contributions/` | |
| `GET /api/v1/admin/contributions/{contribution_id}/diff` | |
| `POST /api/v1/admin/contributions/{contribution_id}/approve` | |
| `POST /api/v1/admin/contributions/{contribution_id}/reject` | |
| `POST /api/v1/admin/contributions/{contribution_id}/claim` | |
| `GET /api/v1/admin/users/` | |
| `POST /api/v1/admin/users/{user_id}/activate` | |
| `POST /api/v1/admin/users/{user_id}/deactivate` | |
| `POST /api/v1/admin/users/{user_id}/promote` | |
| `POST /api/v1/admin/users/{user_id}/demote` | |
| `POST /api/v1/admin/users/{user_id}/password-reset` | |

(12 endpoints.) All `planned`.

### Not mapped to any block — flagged for Block 8 review

These tags/endpoints exist in the live API but have no obvious home in the
Delivery Blocks table (`docs/specs/2026-07-13-ui-repo-design.md`). Block 8
should confirm each is either genuinely out of UI scope (health checks,
OAuth redirect handlers meant for server-to-server use) or represents a
missed domain that should have been folded into an existing block.

**`health` (4 endpoints) — infra probes, not user-facing UI. Likely
unused-by-UI by design, not a gap:**

| Endpoint | Method |
|---|---|
| `GET /api/v1/health/` | |
| `GET /api/v1/health/live` | |
| `GET /api/v1/health/ready` | |
| `GET /api/v1/health/version` | |

**`integrations` (3 endpoints) — Google Drive OAuth connect/callback/revoke.
No block currently covers this; likely relevant to Block 1 (account/profile
settings) or a UI settings surface not yet spec'd:**

| Endpoint | Method |
|---|---|
| `GET /api/v1/integrations/google/connect` | |
| `GET /api/v1/integrations/google/callback` | |
| `DELETE /api/v1/integrations/google` | |

**`users` backup/export/import sub-routes (6 endpoints) — same "no
obvious block owner" issue as above, closely related to `integrations`
(Google Drive backup/restore uses the same OAuth connection):**

| Endpoint | Method |
|---|---|
| `POST /api/v1/users/me/backup/google-drive` | |
| `GET /api/v1/users/me/backup/google-drive/history` | |
| `POST /api/v1/users/me/backup/google-drive/restore` | |
| `GET /api/v1/users/me/export/all.json` | |
| `GET /api/v1/users/me/export/library.csv` | |
| `POST /api/v1/users/me/import/bookshelf` | |
| `POST /api/v1/users/me/import/csv` | |
| `POST /api/v1/users/me/import/goodreads` | |

**`contributions` public router (6 endpoints) — user-facing contribution
CRUD (propose an edit to a book/release/contributor), distinct from
`admin/contributions` (moderation queue, Block 7). No block currently
covers the *authoring* side of contributions:**

| Endpoint | Method |
|---|---|
| `POST /api/v1/contributions/` | |
| `GET /api/v1/contributions/me/contributions` | |
| `GET /api/v1/contributions/{contribution_id}` | |
| `PATCH /api/v1/contributions/{contribution_id}` | |
| `DELETE /api/v1/contributions/{contribution_id}` | |
| `POST /api/v1/contributions/{contribution_id}/submit` | |

This is the single biggest gap in the current block-to-router mapping: the
parent spec's Block 2 (Catalog) covers *reading* books/releases/
contributors, and Block 7 covers *moderating* contributions, but nothing
currently owns the UI for a regular user *proposing* an edit (the
`contributions` router, not `admin_contributions`). Recommend either
folding this into Block 2 (natural home: "suggest an edit" from a book
detail page) or calling it out explicitly if Block 2's spec (already
written in parallel) doesn't address it — Block 8 should check whether
Block 2 picked this up.

**Total:** 130 endpoint+method pairs. Sum of block allocations above
(20+27+24+9+11+8+12 = 111) + unmapped (4+3+8+6 = 21) = 132; the 2-endpoint
discrepancy is from the `/api/v1/books/{...}/reviews` and
`/api/v1/releases/{...}/reviews` rows being counted once each above but
flagged as straddling two blocks — not double-counted in the true total of
130.

## Open Questions for Block 8 (carry forward, don't resolve now)

- Did Block 2 end up covering the public `contributions` router (propose-
  edit flow), or is it still a genuine gap? (Block 2's spec was written in
  parallel with this one and wasn't read here per task instructions — Block
  8 must check.)
- Did any block claim the `integrations`/backup/export/import endpoints, or
  are they a legitimately deferred feature set (candidate for a future
  block, not this delivery's scope)?
- Are the three `ai/*` endpoints real or still "Coming soon" stubs by the
  time Block 6 starts? If still stubbed, Block 6 may need to scope down or
  wait, and Block 8 should record that as a product decision, not an API
  defect.
- `GET /api/v1/users/{user_id}/reviews` and the two `.../reviews` sub-routes
  under books/releases: which block's `lib/api/` file actually implements
  the client call matters more than which block's *pages* display the
  data — Block 8's log should record the owning `lib/api/<domain>.ts` file,
  not just the page, to disambiguate.

## Out of Scope (this block)

- Any actual API-side changes (removing dead endpoints, adding missing
  ones) — that's the follow-up cleanup pass in `bookworm-hole-api`, a
  separate repo/project, only *initiated* (via the summary issue) by this
  block.
- Re-litigating Blocks 1-7's UI scope — Block 8 audits what was built, it
  doesn't redesign it.
- New UI code, components, or pages — this block's output is markdown
  documentation plus optionally one GitHub issue.
