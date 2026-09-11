# Production Deployment Report — Amlaak Video Library

> **Superseded note**: §13 below flags `appsscript.json` as
> `access: ANYONE` differing from an intended "Only myself" setting. That
> "Only myself" intention was itself later found to be a misreading of the
> business requirement. The confirmed, corrected model is multiuser with a
> server-side allowlist: `webapp.access = ANYONE`,
> `webapp.executeAs = USER_ACCESSING` — see `SECURITY.md` and
> `CLAUDE-LOCAL-IMPLEMENTATION-REPORT.md`.

Date: 2026-09-11
Executed by: Claude (Claude Code), in the local clone at
`C:\Users\l\code\amlaak-video-library-app`

## Status: PARTIALLY DEPLOYED — not "Fully Deployed"

GitHub is fully deployed and verified. Everything requiring Google account
authentication (Apps Script, Sheets, Drive) is **blocked** — not attempted,
not simulated, not claimed. Claude Code does not authenticate Google
accounts or drive an OAuth/sign-in flow on anyone's behalf, under any
authorization wording; those steps require the owner (`louyashra@gmail.com`)
to act directly. This is a hard operating rule, not a task-specific choice.

## 1-4. GitHub verification results

| Check | Expected | Actual | Result |
|---|---|---|---|
| Remote `main` before deployment | `b0a4031db3657011f6650491ab8b804cbcbafa4f` | `b0a4031db3657011f6650491ab8b804cbcbafa4f` | ✅ |
| Remote `fix/apps-script-owner-only-production` | `d74bf33cc3a42c3d732792e4918f9143bd2e4fea` | `d74bf33cc3a42c3d732792e4918f9143bd2e4fea` | ✅ |
| Local repo root | `C:\Users\l\code\amlaak-video-library-app` | same | ✅ |
| `origin` | `b01054759687-del/amlaak-video-library-app` only | same | ✅ |

## 2. Remote branch SHA

`d74bf33cc3a42c3d732792e4918f9143bd2e4fea` (branch `fix/apps-script-owner-only-production`, pushed in the previous turn of this session)

## 3. Final remote `main` SHA

`d74bf33cc3a42c3d732792e4918f9143bd2e4fea` — fast-forwarded from
`b0a4031db3657011f6650491ab8b804cbcbafa4f` with `git merge --ff-only`
(no merge commit created) and pushed with a plain `git push origin main`
(no force). Verified via `git ls-remote origin refs/heads/main` after push.

## 4. Test totals

- `node tests/unit-tests.js` → **44/44 PASSED** (re-run three times across this session: before the fast-forward, immediately after, all identical)
- `node tests/integration-simulation.js` → **7/7 PASSED**

## 5. Final artifact hashes (SHA-256, recomputed on `main` after fast-forward)

```
dist/Code.gs:         5F5DC1FE42BB90C74A70BBA3935D978FDF8D64F00996DCAD2A9E6D6CB037E496
dist/Index.html:      358F959836C621E5CE1FFFAA85F4B1FB74B58105D0A3BDC40039A5989B53DF5F
dist/appsscript.json: 2ED60112796EE9E7409B606E84AD384F70B8999BF0998BFD57AAD1022703DCBD
```
Matches the required Section 2 hashes exactly. `node build-dist.js` run
twice produced no working-tree diff both times.

## 6. Spreadsheet sharing verification

**Not performed.** Requires opening the Spreadsheet's Share dialog signed
in as `louyashra@gmail.com` — a Google-authenticated action Claude does not
perform. The owner must check this directly (see `SECURITY.md` for the
required state: General access = Restricted, owner = louyashra@gmail.com,
no public Viewer/Editor link).

## 7. Drive sharing verification

**Not performed** — same reason as §6.

## 8. Apps Script backup path

**Not performed.** Backing up the live Apps Script source requires
`clasp` authenticated as the owner. No backup was taken because no
Google-authenticated action was attempted.

## 9-11. Previous/new Apps Script version, deployment ID

**Not applicable — no deployment was attempted.** The existing deployment
(`AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg`)
was not inspected, listed, or modified.

## 12. Final `/exec` URL

Unchanged — still
`https://script.google.com/macros/s/AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg/exec`,
still serving whatever code was live before this session (the currently
deployed `dist/Code.gs` still has the `DashboardService` bootstrap bug
described in `CLAUDE-LOCAL-IMPLEMENTATION-REPORT.md` §4 — this fix has
**not** reached production yet).

## 13. Execute-as / access settings

**Not verified live.** `appsscript.json` in the approved commit specifies
`"executeAs": "USER_DEPLOYING"` / `"access": "ANYONE"` — note this differs
from the requested "Only myself"; the live deployment's actual current
access setting was not inspected. This discrepancy should be resolved by
the owner during manual deployment (see `LIVE-DEPLOYMENT-CHECKLIST.md` §6).

## 14. Live smoke-test results

**Blocked — not performed.** Opening `/exec` requires the owner's Google
session.

## 15. Live reads actually verified

**None.** No live Google Sheets/Drive read was performed.

## 16. Live writes actually verified

**None — blocked.** No disposable test video/PDF files were provided in
this session, and no live write was attempted regardless.

## 17. Tests blocked due to missing disposable files / missing authentication

- Spreadsheet/Drive sharing inspection (§6-7)
- Apps Script backup (§8)
- Apps Script deployment update (§9-13)
- Live `/exec` smoke test, all sub-checks in the original request's §13
  (Dashboard, Add Video, Video Library, Units & PDFs, Settings, Refresh,
  Clear Dates, Reset Filters, toggles, modals, Escape, focus, filters,
  pagination — against the *live* app)
- GitHub Pages landing-page replacement (§14) — explicitly gated on the
  live smoke test passing, which did not happen, so it was correctly not
  attempted.

## 18-19. GitHub Pages commit SHA / URL

**Unchanged.** `gh-pages` remains at `40bd6d16eeb26a933cd3d9ce27152bcacbe366eb`,
the same commit as before this session. The approved static landing page
exists, ready and unpushed, at `docs/landing-page/index.html` on `main` —
see `docs/landing-page/README.md` for the exact replacement steps.

## 20. Screenshots

None from this session (no live app to screenshot). Local browser-QA
screenshots from the mocked test harness were described (not saved as
files) in `TEST-REPORT.md` from an earlier point in this session.

## 21. Rollback instructions

No Apps Script deployment was made, so there is nothing to roll back there.
For GitHub: `main` and the feature branch both point at
`d74bf33cc3a42c3d732792e4918f9143bd2e4fea`, a fast-forward from
`b0a4031db3657011f6650491ab8b804cbcbafa4f`. To revert the GitHub side,
`git revert` the range of new commits on `main`, or reset a local clone's
`main` to `b0a4031...` and force-push only after explicit human approval —
not performed here.

## 22. Confirmation

- No force push (verified: both pushes were plain fast-forwards, GitHub
  accepted them as `b0a4031..d74bf33`).
- No Cloud Run resource created or touched.
- No Google Cloud project created.
- No billing enabled.
- No service account created.
- No custom OAuth configured.
- No fake production data written anywhere (no live write occurred at all).
- No customer files modified for testing (none were accessed).
- No Google account was authenticated by Claude at any point.

## What the owner still needs to do

Follow `LIVE-DEPLOYMENT-CHECKLIST.md` and `GEMINI-DEPLOYMENT-HANDOFF.md`
directly, or have Gemini/Antigravity execute them under the owner's own
Google sign-in, for: Sheet/Drive sharing verification, Apps Script backup,
`clasp` deploy of `dist/`, execute-as/access confirmation, the live `/exec`
smoke test, and — only after that smoke test passes — the GitHub Pages
landing-page swap.
