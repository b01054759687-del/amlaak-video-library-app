# Amlaak Video Library — Security Policy

## Core principles

1. **Server-side enforcement, never client-side-only.** No authorization
   decision is based on hiding a button. Every protected `apiXxx` gateway in
   `Code.gs` routes through a service function that calls
   `Auth.requireAuth()` (or `Auth.requireOwner()` for Settings/Setup) before
   any Sheet or Drive byte is read or written.
2. **Fail-closed.** Identity comes exclusively from
   `Session.getActiveUser().getEmail()` (trimmed, lower-cased);
   `Auth.gs` never substitutes `Session.getEffectiveUser()` as the
   accessing-user identity — a blank active user fails closed immediately,
   it is not retried against a different identity source. If the resolved
   email is not on the `Authorised_Users` allowlist (and the system is
   already initialized), the request is rejected immediately with
   `UNAUTHORIZED` and the attempt is logged to `Audit_Log`.
3. **Execute-as and Drive pre-conditions.** The web app runs with
   `webapp.executeAs = USER_ACCESSING` — each request executes as the
   Google account currently accessing the app, not as a fixed owner
   identity. A Drive file must be shared as Editor with that same accessing
   account before it can be indexed by that user; `DriveService` surfaces a
   specific, actionable error (`"isn't shared with the app account yet"`)
   rather than a generic failure.
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

Public reachability of the Web App URL (`webapp.access = ANYONE`) is not
the same as public data access — the Sheet and Drive stay fully restricted,
and the server-side allowlist is what actually gates every response.

- **Spreadsheet General Access**: `Restricted`. No public Viewer or Editor
  link.
- **Spreadsheet Owner**: `louyashra@gmail.com` (unchanged).
- **Named collaborators**: an authorised user who needs to add/edit content
  gets named `Editor` access; a view-only user gets named `Viewer` access.
  Named sharing is separate from, and in addition to, the
  `Authorised_Users` allowlist row — both are required for a user to
  actually operate the app (see below).
- **Drive Root Folder access**: `Restricted`, same named Viewer/Editor
  model as the Spreadsheet, owner unchanged. No anonymous access.
- **OAuth scopes** (`appsscript.json`): `spreadsheets`, `drive`,
  `userinfo.email`, `script.scriptapp` — unchanged; no scope beyond what
  the app genuinely uses.

This task made **no** changes to live Google Sheet or Drive sharing
settings.

## Adding or removing an application user

Adding a working user requires **both**:
1. An `Active` row for their email in the `Authorised_Users` Sheet tab
   (Email, Active, Role, Added Date).
2. Named Viewer/Editor sharing on the Spreadsheet and Drive root folder,
   matching the access their role needs.

Removing a user requires:
1. Setting their `Authorised_Users` row's `Active` value to `No`.
2. Removing their named Sheet/Drive sharing where appropriate.

Neither of these was performed by this task — they are owner actions,
documented here for reference.
