# AEO lab — stop leaking internal errors; alert #hack-central instead

## What the user saw

> Key limit exceeded (monthly limit). Manage it using
> https://openrouter.ai/workspaces/default/keys/9e14984f…

That is OpenRouter's reply to a model call, rendered verbatim in the browser.
It names our provider and links the key's management page.

## Why it happened

The worker piped upstream error text straight to the client in **five** places:

| # | file | channel |
|---|---|---|
| 1 | `worker.js` SSE catch | `{type:"error"}` → "Couldn't finish: …" |
| 2 | `worker.js` queries stage | `{type:"warn"}` → "Heads up" box |
| 3 | `worker.js` content stage | same |
| 4 | `worker.js` engines stage | same ← **the one the user hit** |
| 5 | `engines.js` → `visibility.js` | `unavailable[].error` → engine tooltip, **and the 7-day cache** |

## Fix

**Allowlist, not blocklist.** `worker/src/errors.js` is a new boundary: a message
is shown verbatim only if it is a `UserError` — an error deliberately written
for a user. Everything else gets fixed copy from a static table. A blocklist
would have meant every new provider message was a leak waiting to happen; this
way an unrecognised one is merely generic.

- [x] `worker/src/errors.js` — `UserError`, `classify`, `userMessage`,
      `engineFailureReason`, `reportIncident`
- [x] `crawl.js` — the six deliberately user-facing errors become `UserError`
      so containment doesn't swallow "Couldn't reach yoursite.com"
- [x] `worker.js` — all four error channels routed through the boundary
- [x] `visibility.js` — the cached engine tooltip becomes a safe label
- [x] `CACHE_VERSION` v2 → v3 — entries written during the outage have the
      provider notice sitting in `unavailable[].error`, and a cache is a
      seven-day tail on a leak
- [x] `wrangler.toml` — document the secrets, including the new optional
      `ALERT_WEBHOOK`

**Alerting.** `reportIncident()` posts the *real* message to #hack-central with
the failure class, stage and domain. Deduped per (class, stage) for 15 minutes:
a provider-quota failure trips on every scan until the account is topped up, and
un-deduped that is a firehose — a channel that cries wolf stops being read at
exactly the moment it matters. Uses `ALERT_WEBHOOK`, falling back to the
existing `SEARCH_WEBHOOK` → `FEEDBACK_WEBHOOK`, so **alerting works today with
no new configuration**.

**Frontend, defence in depth** (`labs/aeo/app.js`): `safeServerText()` replaces
any server message matching a URL / provider name / long hex string with a
generic sentence. This matters because it protects users *before* the worker
ships, and against a rollback or a stale cached report.

## Verification

Worker suite: **109 pass, 0 fail** (13 new in `test/errors.test.js`, 4 new
end-to-end in `test/worker.test.js`).

Controls run — the new tests fail against the pre-fix code:

```
✖ a provider quota failure never reaches the browser
  AssertionError: key hash reached the browser
✖ the report still lands when the model half is dead
✖ the failure the user was spared is the one #hack-central is told
```

Browser test (Playwright, real `app.js`, fake worker emitting the exact
production string on all three channels):

| | guard on | guard disabled (control) |
|---|---|---|
| key hash | contained | **LEAKED** |
| provider name | contained | **LEAKED** |
| quota notice | contained | **LEAKED** |
| manage-key URL | contained | **LEAKED** |

Shown instead: *"Something went wrong on our end. We've been notified — please
try again shortly."* And critically, the report still renders: a dead model half
degrades to the deterministic audit rather than failing the run.

Also confirmed still working: a bad URL still says what is wrong with it
(`"That doesn't look like a real domain."`), which is what the allowlist buys.

## Not done — needs the user

- Nothing is committed, pushed or deployed in either repo.
- The underlying account limit is a separate, operational fix.
