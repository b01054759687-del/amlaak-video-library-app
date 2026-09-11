# Gemini / Antigravity Deployment Handoff — Amlaak Video Library

This is a strict handoff. Read it fully before doing anything.

**IMPORTANT — delivery mechanism**: this branch was produced in a separate
local clone (`C:\Users\l\code\amlaak-video-library-app` on the machine
where Claude Code ran) and was **never pushed to `origin`**. It cannot be
fetched from GitHub. It is delivered to you as a **Git bundle**:
`D:\AntigravityExports\AMLAAK-CLAUDE-HANDOFF\amlaak-claude-approved.bundle`
(see `GIT-BUNDLE-EXPORT-MANIFEST.md` in that same folder for full details).
Import from the bundle, not from `origin`.

## 1. What is approved

- **Source branch**: `fix/apps-script-owner-only-production`.
- **Approved commit SHA**: `85b2743b02e854415dfeb2370fd948c512697f9f`
  — this is the exact, single commit approved for deployment. It is one
  commit ahead of `main` (`b0a4031db3657011f6650491ab8b804cbcbafa4f`).
- **Before doing anything else**, verify the bundle and import it into your
  own working repository (`D:\AntigravityProjects\amlaak-video-library-app`
  or wherever you are operating):
  ```bash
  git bundle verify "D:\AntigravityExports\AMLAAK-CLAUDE-HANDOFF\amlaak-claude-approved.bundle"
  git fetch "D:\AntigravityExports\AMLAAK-CLAUDE-HANDOFF\amlaak-claude-approved.bundle" fix/apps-script-owner-only-production:claude-approved
  git log -1 --format="%H %s" claude-approved
  ```
  This **must** print exactly `85b2743b02e854415dfeb2370fd948c512697f9f fix: restore secure Apps Script production workflows`.
  **If the SHA differs, if the bundle fails verification, or if the branch
  is missing, STOP and do not proceed.** Report the discrepancy back instead
  of guessing which commit was intended. Do not merge `claude-approved` into
  your own working branch's history beyond what is needed to read its
  `dist/` files — do not rewrite or rebase it.

## 2. What you may deploy

Only the contents of `dist/` as committed in the approved commit:
`dist/Code.gs`, `dist/Index.html`, `dist/appsscript.json`. These were built
by `node build-dist.js` from the modular source files in the same commit,
verified deterministic (two consecutive builds produced byte-identical
SHA-256 hashes), and scanned for mock data, Cloud Run/OAuth remnants, and
`localStorage`/token usage (all clean — see `TEST-REPORT.md` §1).

**Verify your imported copy matches before deploying it** — after checking
out `claude-approved` (or extracting its `dist/` tree), compute:
```powershell
Get-FileHash dist\Code.gs, dist\Index.html, dist\appsscript.json -Algorithm SHA256
```
and confirm it matches exactly:
```
dist/Code.gs:         C6BB8A63A48A297300DA0868E16801749A53813F40DA87E1483CB7B733BE8709
dist/Index.html:      2A33FD396B6C385F9043E1DE6F2D18A7A1AABAC3154410CB9489683539C3DEC0
dist/appsscript.json: EB0C40AA63123A43BC079DB09761C9B2F9A59FA002A3FF8EB023C0D94EE639F0
```
If any hash differs, STOP — you are not looking at the approved build.

## 3. What you must NOT do

- **Do not rewrite, "improve," or refactor any application logic.** Your
  role is to push the already-approved, already-tested `dist/` bundle and
  update the existing Apps Script deployment — nothing else.
- Do not merge `fix/apps-script-owner-only-production` into `main` yourself
  unless the human owner explicitly asks you to, separately from this
  deployment handoff.
- Do not modify the `gh-pages` branch beyond publishing the single file at
  `docs/landing-page/index.html` (see `docs/landing-page/README.md`), and
  only if the owner has separately asked for the landing page to go live.
- Do not create a new Apps Script deployment URL. Update the existing one:
  `AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg`.
- Do not touch Google Sheet or Drive sharing permissions.
- Do not create a Google Cloud project, service account, or any billing
  resource — none is required.

## 4. Tests already completed (do not re-litigate, but do verify)

See `TEST-REPORT.md` for full detail:
- Static: syntax-checked all 14 root `.gs` files; found and fixed a
  production-breaking scope bug in `DashboardService.gs`.
- Local simulation: 51/51 Node.js tests passing
  (`tests/unit-tests.js` + `tests/integration-simulation.js`).
- Browser QA: real production client code exercised in a local harness
  against a mocked server (see `tests/build-preview.js`); found and fixed a
  dead "View" button, undersized action buttons, and a misleading KPI label.
- **Not performed** (blocked pending this deployment): any real Google
  Sheets/Drive/Apps Script execution. That is exactly what you are being
  asked to enable — do not claim it was already verified.

## 5. Exact GitHub and Apps Script operations

Follow `LIVE-DEPLOYMENT-CHECKLIST.md` step by step, in order:
1. Sheet permission verification (read-only).
2. Drive permission verification (read-only).
3. `clasp login` as `louyashra@gmail.com`.
4. `clasp push` — must push exactly `Code.gs`, `Index.html`,
   `appsscript.json`, sourced from `dist/` in the approved commit.
5. Update the existing deployment (new version, same deployment ID/URL).
6. Confirm Execute as: Me: confirm access is owner-only.

## 6. Exact smoke tests

Perform `LIVE-DEPLOYMENT-CHECKLIST.md` §8 in full:
- Dashboard loads with no fatal-error overlay.
- KPI numbers match a manual spot-check against the real Sheet.
- Video Library search/filter/pagination work against real rows.
- One existing Unit's detail view shows real data, not a loading
  placeholder and not "Ahmed Hassan"/"U-0001".
- No unsolicited test data is added to the real Sheet or Drive.

## 7. Rollback process

If any smoke test fails: `LIVE-DEPLOYMENT-CHECKLIST.md` §9 — in the Apps
Script editor, **Deploy → Manage deployments**, select the previous version
number (noted before you updated it in step 5.5), **Save**. No data
migration is ever needed for a code-only rollback.

## 8. Evidence you must return

- The exact deployment version number you created, and the previous
  version number (for rollback reference).
- Confirmation `clasp push` reported exactly 3 files.
- The smoke-test results from §6, including the spot-checked KPI number and
  which Sheet row it corresponds to.
- Confirmation that no Sheet/Drive permissions were changed.
- If anything in §1's verification failed (wrong commit count/message),
  report that immediately instead of proceeding.
