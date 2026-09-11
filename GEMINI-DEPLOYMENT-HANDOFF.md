# Gemini / Antigravity Deployment Handoff — Amlaak Video Library

This is a strict handoff. Read it fully before doing anything. This file
supersedes all earlier versions of itself.

## 0. History (for context only — do not act on superseded items)

1. `fix/apps-script-owner-only-production` was pushed to `origin` and
   fast-forward-merged into `main` (now at `1bf3e474088a2bdc1e0807fd82a0306c3b43fe47`).
2. A branch `fix/apps-script-owner-only-manifest` then set
   `webapp.access = MYSELF` based on a misreading of the business
   requirement. **That branch must never be merged or deployed.**
3. The confirmed, corrected access model is multiuser with a server-side
   allowlist: `webapp.access = ANYONE`, `webapp.executeAs = USER_ACCESSING`,
   on branch `fix/apps-script-authorised-users-access`.

## 1. What is approved for deployment

- **Branch**: `fix/apps-script-authorised-users-access`, pushed to
  `origin` (real GitHub push — no bundle needed; the earlier bundle-based
  handoff at `D:\AntigravityExports\AMLAAK-CLAUDE-HANDOFF\` is obsolete now
  that `origin` has everything).
- Before doing anything else, verify:
  ```bash
  git fetch origin
  git log origin/main..origin/fix/apps-script-authorised-users-access --oneline
  ```
  This must show exactly one commit,
  `fix: enforce authorised-user Apps Script access`. **If it shows zero
  commits, more than one, or a different message, STOP** and report the
  discrepancy — do not guess which commit was intended.
- Confirm `origin/main` is `1bf3e474088a2bdc1e0807fd82a0306c3b43fe47` before
  merging the corrective branch into it. Do not merge
  `fix/apps-script-owner-only-manifest` into anything.

## 2. What you may deploy

Only `dist/Code.gs`, `dist/Index.html`, `dist/appsscript.json` from the
approved commit on `fix/apps-script-authorised-users-access`, built by
`node build-dist.js`. Verify the manifest before deploying:
```powershell
node -e "console.log(JSON.parse(require('fs').readFileSync('dist/appsscript.json','utf8')).webapp)"
```
Must print `{ access: 'ANYONE', executeAs: 'USER_ACCESSING' }`. If it
prints `MYSELF` or `USER_DEPLOYING`, **STOP** — you are looking at the
wrong branch/commit.

## 3. What you must NOT do

- Do not rewrite, "improve," or refactor any application logic.
- Do not merge `fix/apps-script-owner-only-manifest` — it is superseded
  and incorrect.
- Do not merge the corrective branch into `main` yourself unless the human
  owner explicitly asks, separately from this handoff.
- Do not modify `gh-pages` beyond publishing `docs/landing-page/index.html`
  as described in `docs/landing-page/README.md`, and only after the live
  `/exec` smoke test passes.
- Do not create a new Apps Script deployment URL — update the existing one:
  `AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg`.
- Do not touch Google Sheet or Drive sharing permissions yourself.
- Do not create a Google Cloud project, service account, or any billing
  resource.
- Do not configure custom OAuth or Google Identity Services.

## 4. Tests already completed

See `TEST-REPORT.md` and `CLAUDE-LOCAL-IMPLEMENTATION-REPORT.md`. Includes
a gateway-authorisation audit (every `api*` function statically verified
to enforce `Auth.requireAuth`/`requireOwner`, directly or via a delegated
service call) and an allowlist-matching logic simulation (active/inactive/
missing/blank/case/whitespace). **Not performed**: any real Google
Sheets/Drive/Apps Script execution — that is what this handoff enables.

## 5. Exact GitHub and Apps Script operations

Follow `LIVE-DEPLOYMENT-CHECKLIST.md` step by step:
1. Sheet permission verification (read-only) — General access stays
   `Restricted`; named Editor/Viewer sharing per user, not public.
2. Drive permission verification (read-only) — same model; remember every
   authorised user (not just the owner) needs their own named Editor
   access to upload/rename files, since execution now runs as the
   accessing user.
3. `clasp login` as the owner (`louyashra@gmail.com`) to push, but the
   *deployed app* will run each request as whoever is accessing it.
4. `clasp push` — exactly `Code.gs`, `Index.html`, `appsscript.json`.
5. Update the existing deployment (new version, same deployment ID/URL).
6. Confirm deployment settings: **Execute as: User accessing the web app**,
   **Who has access: Anyone with a Google account** (not anonymous).

## 6. Exact smoke tests

Per `LIVE-DEPLOYMENT-CHECKLIST.md` §8:
- Dashboard loads with real data, no fatal-error overlay.
- KPI numbers spot-checked against the real Sheet.
- One existing Unit's detail view shows real data.
- If a second Google account is available, confirm it gets a clean
  "Access Denied" state (not a blank screen, not stale/fake data) if it is
  not on the `Authorised_Users` allowlist.
- No unsolicited test data added to the real Sheet or Drive.

## 7. Rollback process

`LIVE-DEPLOYMENT-CHECKLIST.md` §9 — **Deploy → Manage deployments** in the
Apps Script editor, select the previous version, **Save**. No data
migration is ever needed for a code-only rollback. For GitHub, `git revert`
the merge commit on `main` — never rewrite history.

## 8. Evidence you must return

- The exact deployment version number created, and the previous version
  number.
- Confirmation `clasp push` reported exactly 3 files.
- The smoke-test results from §6, including the access-denied check if
  performed.
- Confirmation the manifest deployed shows `access: ANYONE`,
  `executeAs: USER_ACCESSING` — not `MYSELF`/`USER_DEPLOYING`.
- Confirmation no Sheet/Drive permissions were changed beyond what the
  owner explicitly directed.
