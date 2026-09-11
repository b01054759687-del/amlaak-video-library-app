# Amlaak Video Library — Google Apps Script Production Application

Amlaak Video Library archives and version-tracks project videos, marketing
content, and unit architectural design PDFs for Amlaak Design, using Google
Sheets as the metadata database and Google Drive as file storage.

## Production architecture (confirmed)

```
Owner's browser
    |
    v
Google Apps Script Web App (/exec)
    |
    v
Apps Script server functions (Code.gs + services)
    |
    v
Google Sheets metadata database  +  Google Drive video/PDF storage
```

- The operational application is the Apps Script `/exec` Web App. There is
  **no** Cloud Run backend, no Express server, no custom OAuth client, and no
  browser-stored access token in the production path.
- The client (`Index.html` + `Client.html` + `Styles.html`) talks to the
  server exclusively through `google.script.run`.
- GitHub is the source of truth for code, docs, builds, and tests. GitHub
  Pages is **not** part of the operational data application — see
  [Deprecated / non-production code](#deprecated--non-production-code).

## Current operational resources

- Repository: `https://github.com/b01054759687-del/amlaak-video-library-app`
- Apps Script Web App URL: `https://script.google.com/macros/s/AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg/exec`
- Apps Script Script ID: `1JrzD-iy_FnxXkQLBPiZ5AeZCa7HMIXrnTfxJLzqePGnygZmLCKcYkWjB`
- Spreadsheet ID: `1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4`
- Drive Root Folder ID: `172YFf4GteBT5x_WxQxr-ldo79f0XuRrh`
- Owner account: `louyashra@gmail.com`

These are configuration values used server-side via `ScriptProperties`; they
are not meant to be surfaced unnecessarily in the client UI.

## Access model

The current production phase is **owner-only**. `louyashra@gmail.com` is the
System Owner. The `Authorised_Users` sheet schema exists for future
multi-user access, but adding a row to it does not by itself grant access
under the current owner-executed, owner-only deployment — that requires a
deliberate, separately-approved deployment change. See
`LIVE-DEPLOYMENT-CHECKLIST.md`.

## Repository layout

- `Code.gs`, `Auth.gs`, `Config.gs`, `Utils.gs`, `Validators.gs`,
  `NamingService.gs`, `AuditService.gs`, `SheetRepository.gs`,
  `DriveService.gs`, `UnitService.gs`, `VideoService.gs`, `PdfService.gs`,
  `DashboardService.gs`, `Setup.gs` — modular Apps Script server source.
- `Index.html`, `Client.html`, `Styles.html` — the HTML Service client.
- `appsscript.json` — Apps Script manifest (scopes, webapp config).
- `build-dist.js` — bundles the files above into `dist/Code.gs`,
  `dist/Index.html`, `dist/appsscript.json` for one-shot `clasp push` /
  copy-paste deployment. **Edit the modular source files, then rebuild —
  never hand-edit `dist/`.**
- `tests/unit-tests.js`, `tests/integration-simulation.js` — Node.js test
  suites covering naming rules, ID generation, validation, dashboard math,
  and end-to-end workflow simulation.
- `tests/build-preview.js`, `tests/preview-mocks.js` — a **local-only**
  browser QA harness (never bundled into `dist/`, never deployed) that lets
  the real UI be exercised in a plain browser tab without an Apps Script
  container. Run `node tests/build-preview.js`, then open
  `tests/.preview/index.html`.

## Building and testing locally

```bash
node build-dist.js              # regenerate dist/ from source
node tests/unit-tests.js        # unit tests
node tests/integration-simulation.js   # workflow simulation
node tests/build-preview.js     # build the local browser QA harness
```

## Deprecated / non-production code

The following directories/files are historical experiments from an earlier
Cloud Run + GitHub Pages + custom OAuth remediation attempt. They are **not**
imported, built, or deployed by `build-dist.js`, and are not part of the
production path:

- `backend/` — Express/Cloud Run REST API (Docker, service-account-style auth).
- `frontend/` — Vite/Tailwind SPA using Google Identity Services custom sign-in.
- `standalone-app.html` — an earlier Arabic-language standalone HTML export.
- `gh-pages` branch — a static landing-page experiment with an embedded
  custom OAuth sign-in flow.

These are kept for audit history only. See
`CLAUDE-LOCAL-IMPLEMENTATION-REPORT.md` for the recommended future deletion
list, and `GITHUB-PAGES-DEPLOYMENT.md` / `GOOGLE-CLOUD-SETUP.md` /
`BACKEND-SETUP.md` / `FRONTEND-SETUP.md` / `AUTHENTICATION.md` for the
deprecation banners now added to each.

## Further reading

- `ARCHITECTURE.md` — architecture and request lifecycle.
- `SECURITY.md` — security model and required sharing configuration.
- `DATA-DICTIONARY.md` — sheet schema.
- `TEST-REPORT.md` — latest test execution results.
- `LIVE-DEPLOYMENT-CHECKLIST.md` — exact steps for a human/Gemini to push
  `dist/` to the real Apps Script deployment.
- `GEMINI-DEPLOYMENT-HANDOFF.md` — strict handoff instructions for Gemini/
  Antigravity to execute the approved deployment only.
