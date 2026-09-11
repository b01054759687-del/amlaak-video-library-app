# Live Deployment Checklist

This is the exact sequence for a human (or Gemini/Antigravity acting under
`GEMINI-DEPLOYMENT-HANDOFF.md`) to take the approved local commit live.
Nothing in this checklist was performed by this task.

**Superseded note**: an earlier revision of this checklist described an
owner-only manifest (`webapp.access = MYSELF`) on branch
`fix/apps-script-owner-only-manifest`. That branch was based on a
misreading of the business requirement and must **not** be merged or
deployed. The confirmed access model is multiuser, server-side allowlist
enforced: `webapp.access = ANYONE`, `webapp.executeAs = USER_ACCESSING`,
corrected on branch `fix/apps-script-authorised-users-access`. Deploy from
that branch (once merged to `main` and approved), not from the owner-only
one.

## 0. Prerequisites

- The approved local commit exists on branch `fix/apps-script-owner-only-production`.
- `node build-dist.js` has been run against that commit and `dist/` matches
  (see the local implementation report for the exact commit SHA).
- Owner (`louyashra@gmail.com`) is available to authenticate if `clasp`
  requires an interactive login.

## 1. Sheet permission verification (read-only check, no changes)

1. Open the Spreadsheet (`1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4`) →
   **Share**.
2. Confirm **General access = Restricted**, not "Anyone with the link."
3. Confirm the Owner is `louyashra@gmail.com`.
4. Review the named-collaborator list; confirm each entry is intentional
   (Viewer or Editor only where genuinely required).
5. Do **not** change anything yet if a discrepancy is found — note it and
   get the owner's explicit decision first.

## 2. Drive permission verification (read-only check, no changes)

1. Open the Drive root folder (`172YFf4GteBT5x_WxQxr-ldo79f0XuRrh`).
2. Confirm sharing is limited to intentionally approved accounts (no public
   or "anyone with the link" access).
3. `appsscript.json` sets `"executeAs": "USER_ACCESSING"` — the script runs
   as whichever authorised account is using it, not a fixed owner identity.
   Confirm every authorised user who will register videos or upload PDFs
   has named Editor access to this folder and its relevant subfolders
   (not just the owner) — otherwise `DriveService` will correctly reject
   their uploads with an actionable "share as Editor" error.

## 3. `clasp` authentication

1. Install `clasp` if not already available: `npm install -g @google/clasp`.
2. `clasp login` — authenticate as `louyashra@gmail.com` in the browser
   flow that opens. This creates a local `.clasprc.json`; it must **never**
   be committed (already gitignored).
3. Confirm the project is linked to the correct Script ID: check
   `.clasp.json` has `"scriptId": "1JrzD-iy_FnxXkQLBPiZ5AeZCa7HMIXrnTfxJLzqePGnygZmLCKcYkWjB"`.
   If `.clasp.json` does not exist locally, create it with that scriptId and
   `"rootDir": "dist"`.

## 4. Push `dist/`

1. From the repository root: `clasp push` (with `rootDir` pointed at `dist/`,
   or run `clasp push` from inside `dist/` with its own `.clasp.json`).
2. Confirm the push reports exactly 3 files: `Code.gs`, `Index.html`,
   `appsscript.json`.
3. Do **not** push any file from `backend/`, `frontend/`, or
   `standalone-app.html` — they are not part of the Apps Script project.

## 5. Update the existing Apps Script deployment

1. In the Apps Script editor (or via `clasp deploy`), note the currently
   active deployment version number (**Deploy → Manage deployments**) —
   this is the rollback target.
2. Create a new version and update the existing web app deployment
   (`AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg`)
   to point at the new version. Do not create a brand-new deployment URL —
   the owner already shares/uses the existing `/exec` link.

## 6. Execute-as / access configuration

1. Confirm deployment settings show **Execute as: User accessing the web
   app** (matches `webapp.executeAs = USER_ACCESSING`).
2. Confirm **Who has access: Anyone with a Google account** (matches
   `webapp.access = ANYONE`) — signed-in Google users can open the URL;
   anonymous/unauthenticated access must remain disabled (Apps Script's
   "Anyone" web-app option already requires Google sign-in — do not select
   any variant offering anonymous access).
3. This makes the URL reachable by any signed-in Google user, but the
   server-side `Authorised_Users` allowlist is what actually decides
   whether they get any data back — reachability is not the same as
   access. See `SECURITY.md`.

## 7. Open the `/exec` URL

1. Open `https://script.google.com/macros/s/AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg/exec`
   as the owner.
2. Grant any one-time authorization scope prompts (Sheets, Drive, userinfo,
   scriptapp) if this is the first run after a scope change.

## 8. Safe smoke test (no destructive actions)

1. Dashboard loads without an error overlay; "Live data from Google Sheets"
   only appears after a successful load (never before).
2. KPI numbers match the real current row counts in the Sheet (spot-check
   one number against the Sheet directly).
3. Video Library search/filter/pagination work against real rows.
4. Open one existing Unit's detail view — confirm real client name/location
   appear (not a loading placeholder, not stale fixture data).
5. Do **not** add a test video, unit, or PDF against the real Sheet/Drive
   during this smoke test unless the owner explicitly asks for one — if they
   do, use an obviously-labeled test unit and delete it manually afterward.
6. Settings screen is reachable only as the owner; confirm no console errors.
7. If a second Google account not on the `Authorised_Users` allowlist is
   available, open the `/exec` URL as that account and confirm it gets a
   clean English "Access Denied" state with no dashboard/unit/video data —
   never a silent blank screen or a stack trace.

## 9. Rollback (if the smoke test fails)

Follow `ROLLBACK.md`: **Deploy → Manage deployments** → select the
previous version noted in step 5.1 → **Save**. No data migration is ever
required for a code-only rollback.

## 10. Evidence to keep

- The exact deployment version number created.
- A screenshot or copy of the smoke-test results from step 8.
- Confirmation that `.clasprc.json` was not committed.
