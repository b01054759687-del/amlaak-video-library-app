# Amlaak Video Library — Security Policy

## Core principles

1. **Server-side enforcement, never client-side-only.** No authorization
   decision is based on hiding a button. Every protected `apiXxx` gateway in
   `Code.gs` routes through a service function that calls
   `Auth.requireAuth()` (or `Auth.requireOwner()` for Settings/Setup) before
   any Sheet or Drive byte is read or written.
2. **Fail-closed.** If the signed-in Google identity cannot be resolved, or
   the email is not on the `Authorised_Users` allowlist (and the system is
   already initialized), the request is rejected immediately with
   `UNAUTHORIZED` and the attempt is logged to `Audit_Log`.
3. **Execute-as and Drive pre-conditions.** The web app runs as the
   publishing owner. Files must be shared with that account as Editor before
   they can be indexed; `DriveService` surfaces a specific, actionable error
   (`"isn't shared with the app account yet"`) rather than a generic failure.
4. **No secrets or OAuth material in the repository.** `.gitignore` excludes
   `.clasprc.json`, `.clasp.json`, `.env`, `credentials.json`, `token.json`,
   and binary media/customer exports. Configuration (Spreadsheet ID, Drive
   folder IDs) lives in Apps Script `ScriptProperties`, not in client code.
5. **Audit logging.** Every add/version/upload/metadata-edit/batch-rename
   action is recorded in `Audit_Log` with timestamp, actor email, action,
   entity ID, and a safe message — never a raw stack trace.
6. **Output escaping.** All server-derived strings rendered into the DOM go
   through `escapeHtml()`; there is no untrusted inline `onclick` string
   construction in the Video Library or Unit Detail views.
7. **No browser-held credentials.** There is no OAuth client ID, no bearer
   token, and no token storage (`localStorage`/`sessionStorage`/cookies/
   IndexedDB) anywhere in the production client, because there is no token
   to store — identity comes from the signed-in Google session.

## Required final sharing state (documented, not changed by this task)

- **Spreadsheet General Access**: `Restricted`.
- **Spreadsheet Owner**: `louyashra@gmail.com`.
- **Named collaborators**: Viewer or Editor only where explicitly required;
  no `Anyone with the link = Editor`.
- **Drive folder access**: limited to intentionally approved accounts.
- **OAuth scopes** (`appsscript.json`): `spreadsheets`, `drive`,
  `userinfo.email`, `script.scriptapp` — no scope beyond what the app
  genuinely uses.

This task made **no** changes to live Google Sheet or Drive sharing
settings. The owner is separately reviewing existing collaborator
permissions; that review is outside this task's scope.

## Known limitation

The `Authorised_Users` sheet schema exists for future multi-user access, but
adding a row to it does not, by itself, grant a Gmail user access to the
current owner-only deployment — see `README.md` and
`LIVE-DEPLOYMENT-CHECKLIST.md`.
