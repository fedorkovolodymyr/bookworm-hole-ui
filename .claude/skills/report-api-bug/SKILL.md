---
name: report-api-bug
description: Use whenever work in bookworm-hole-ui uncovers a bug, mismatch, or missing feature in bookworm-hole-api (500s, schema/OpenAPI mismatch vs real DB, endpoint missing/wrong shape, CORS, migration drift). Files a GitHub issue in fedorkovolodymyr/bookworm-hole-api and blocks the current UI PR from merging until it's fixed and reverified.
---

# Report API Bug

Bookworm Hole is split across two repos: `bookworm-hole-ui` (this repo) and
`bookworm-hole-api` (sibling, GitHub `fedorkovolodymyr/bookworm-hole-api`).
UI work regularly surfaces API-side bugs (schema drift, missing migrations,
wrong response shape vs OpenAPI, 500s). Those bugs must not be silently
worked around in the UI — they get filed against the API repo and the UI
PR must call them out.

## When a bug is found

1. **Confirm it's real, not a UI mistake.** Reproduce with `curl` against
   the running API (or check `docker logs <api-container>` for the
   traceback). Don't file speculative issues.
2. **Gather evidence:**
   - Exact request (method, path, body) that triggers it.
   - Exact response (status code, error body).
   - Relevant traceback lines from `docker logs`, if server-side.
   - Root cause if apparent (e.g. `alembic_version` head vs model fields,
     `psql \d <table>` output showing a missing column).
3. **File a GitHub issue** in `fedorkovolodymyr/bookworm-hole-api`:

```bash
gh issue create \
  --repo fedorkovolodymyr/bookworm-hole-api \
  --title "<short symptom, e.g. 'POST /auth/register 500s: user.friends_can_see_library column missing'>" \
  --body "$(cat <<'EOF'
## Symptom
<what broke, from the UI repo's perspective — which UI flow/block hit this>

## Repro
```

curl -X POST http://localhost:8000/api/v1/... -d '...'

```

## Observed
<status code + error body>

## Root cause (if known)
<e.g. DB column missing vs ORM model; alembic head is X but migration for
field Y never applied/generated>

## Traceback
```

<relevant docker logs lines>
```
EOF
)"
```

Capture the returned issue URL and number — needed for step 4.

4. **Block the UI PR on it.** In the UI PR description (or plan doc if no
   PR yet), add a section:

```markdown
## API Blocker

Blocked on fedorkovolodymyr/bookworm-hole-api#<N> — <one-line symptom>.
Do not merge this PR until that issue is closed AND the affected flow has
been re-verified end-to-end against the fixed API.
```

If a plan/spec doc is being written before any PR exists yet (e.g. during
brainstorming/planning), add the same blocker note into the plan doc's
constraints section instead, so whoever executes the plan sees it.

5. **Don't work around it in the UI.** Mocking around a real API bug to
   make the UI "look done" hides the problem. Continue other unblocked
   plan tasks; leave the blocked task's tests/wiring pointed at the real
   API so it fails loudly until the API is fixed.

6. **On re-verification:** once the API issue is closed, re-run the exact
   repro `curl` (or the affected UI flow) against the API before removing
   the blocker note / allowing merge. Close the loop — don't just trust
   the API repo's own claim of "fixed."

## Non-goals

- Do not open a PR against `bookworm-hole-api` yourself unless explicitly
  asked — filing the issue is enough; the API side is out of scope for
  this repo's agent.
- Do not silently retry/ignore a failing endpoint and mark UI work "done."
