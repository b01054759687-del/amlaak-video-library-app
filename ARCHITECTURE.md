# Amlaak Video Library — System Architecture & Production Design

## 1. Overview & confirmed topology

The Amlaak Video Library runs entirely inside Google Apps Script. There is
no separate hosting tier, no container, and no custom identity provider.

```
Any authorised signed-in Google user's browser
    |
    v
Google Apps Script Web App (/exec)  [webapp.access = ANYONE, executeAs = USER_ACCESSING]
    |
    v
Apps Script server functions (Code.gs, Auth.gs, *Service.gs)
    -> server-side check against the Authorised_Users Sheet tab
    |
    v
Google Sheets metadata database   +   Google Drive video/PDF storage
```

- **Host**: Google Apps Script HTML Service, served from the `/exec` URL.
  Any signed-in Google user can open the URL (`webapp.access = ANYONE`);
  whether they get anything back is decided entirely server-side.
- **Identity**: `Session.getActiveUser().getEmail()` — the Google account
  of whoever is currently accessing the app (`webapp.executeAs =
  USER_ACCESSING`). `Auth.gs` never falls back to
  `Session.getEffectiveUser()` for authorisation identity; a blank active
  user fails closed. No custom OAuth client, no Google Identity Services
  JS, no bearer token ever touches the browser.
- **Authorisation**: every protected server call re-checks the accessing
  email (trimmed, lower-cased) against the `Authorised_Users` Sheet tab.
  Only an `Active` row grants access; unknown, inactive, or blank
  identities are rejected with `UNAUTHORIZED`. The owner
  (`louyashra@gmail.com`) is just another allowlist row with role
  `System Owner` — required for owner-only actions (Setup, System Config).
- **Client/server transport**: `google.script.run` only.
- **Database**: Google Sheets (`1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4`).
- **File storage**: Google Drive
  (`172YFf4GteBT5x_WxQxr-ldo79f0XuRrh`) — videos and unit design PDFs are
  renamed/moved in place; they are never copied.

## 2. Component breakdown

### 2.1 Client (`Index.html` + `Client.html` + `Styles.html`)
- English, LTR, dark navy/gold UI. Every server call is an async
  `google.script.run` call through the `callApi()` wrapper with a success
  handler, failure handler, loading state, and safe error state (see
  `showFatalConnectionError` / `showToast` in `Index.html`).
- A single bootstrap round trip (`apiGetAppBootstrapData`) loads the safe
  signed-in user summary, taxonomies, dashboard KPIs, and unit lookups on
  page load.
  Video Library and Unit detail data are lazy-loaded on demand.
- No `localStorage`/`sessionStorage`/cookie/IndexedDB token storage exists
  anywhere in the client — there is no token to store.

### 2.2 Server (`Code.gs` + service modules)
- `Code.gs` exposes `apiXxx` gateways; each wraps its service call in
  `handleApiCall()`, which returns the `{ ok, data, errorCode, message }`
  contract and never leaks raw stack traces or Sheet contents to the client.
- `Auth.gs` centralizes identity resolution (`getCurrentUser`) and
  authorization (`requireAuth`, `requireOwner`). Every service function that
  reads or writes protected data calls `Auth.requireAuth()`; `apiSetupSystem`
  and `apiGetSystemConfig` additionally call `Auth.requireOwner()`. An
  unrecognized or unauthorized identity fails closed with `UNAUTHORIZED`.
- `SheetRepository.gs` centralizes all Sheet reads/writes and header mapping
  by name (never hard-coded column numbers).
- `DriveService.gs` centralizes Drive file rename/move and editor-access
  verification.
- `NamingService.gs` / `Validators.gs` centralize filename generation and
  input validation (Drive File ID, dates, Work Category, MIME/size for PDFs).
- `AuditService.gs` writes safe, non-sensitive audit entries.
- `DashboardService.gs` computes all dashboard KPIs from live Sheet data —
  distinct logical videos are counted once regardless of version count.
- `Setup.gs` provides idempotent schema migration (adds missing headers,
  never shifts existing data, never duplicates tabs, never creates
  illustrative rows).

### 2.3 Storage & persistence
- **Google Sheets ID**: `1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4` — the
  exclusive source of truth for `Units`, `Video_Versions`,
  `Unit_Design_PDFs`, `Lists`, `Authorised_Users`, `Audit_Log`,
  `System_Config`.
- **Google Drive Root Folder ID**: `172YFf4GteBT5x_WxQxr-ldo79f0XuRrh` — the
  exclusive physical file repository.

## 3. Request lifecycle & security perimeter

1. Any signed-in Google user can open the `/exec` URL; Apps Script serves
   `Index.html` under that person's own Google identity (Session-based,
   not a custom login flow).
2. Every `apiXxx` call re-resolves identity server-side via
   `Auth.getCurrentUserEmail()` (never `getEffectiveUser()`) and checks the
   `Authorised_Users` allowlist (or bootstrap-owner mode before first
   setup). An unlisted or inactive user gets a clean `UNAUTHORIZED`
   response with no protected data — never a silently-hidden UI element.
   No authorization decision is based on hiding a button in the UI.
3. State-changing actions (`apiAddProjectVideo`, `apiCreateUnit`,
   `apiUploadPdf`, `apiUpdateUnit`, …) validate input, acquire a
   `LockService` lock where sequence generation or rename is involved, then
   write to Sheets/Drive and log to `Audit_Log`.
4. Errors are caught in `handleApiCall()`, classified into a small safe
   `errorCode` set, logged, and returned without stack traces.

## 4. Deprecated architecture (not part of the production path)

An earlier remediation attempt introduced a decoupled
`GitHub Pages frontend -> Cloud Run REST API -> Sheets/Drive` architecture
with Google Identity Services sign-in and bearer tokens. That code still
exists in the repository for audit purposes (`backend/`, `frontend/`,
`standalone-app.html`, the `gh-pages` branch) but is **not** referenced by
`build-dist.js`, **not** part of `dist/`, and **not** the operational
application. See `README.md` → "Deprecated / non-production code" and the
deprecation banners on `AUTHENTICATION.md`, `GOOGLE-CLOUD-SETUP.md`,
`BACKEND-SETUP.md`, `FRONTEND-SETUP.md`, and `GITHUB-PAGES-DEPLOYMENT.md`.
