# Amlaak Video Library — Test Report

Date: 2026-09-11 | Branch: `fix/apps-script-owner-only-production`

This report distinguishes four kinds of verification: **static**
(syntax/lint-level checks with no execution), **local simulation** (Node.js
reimplementations of the naming/ID/validation/dashboard logic — these do
not execute the real `.gs` files inside a Google environment), **browser
testing** (real DOM/JS execution in a Chromium tab against a local static
copy of the actual production `Index.html`/`Client.html`, driven by a
mock `google.script.run` replacement — the real client code runs, only the
server responses are simulated), and **live Google integration** (genuinely
executing inside Apps Script against the real Sheet/Drive — not performed).

## 1. Static verification

| Check | Command | Result |
|---|---|---|
| Syntax check, all 14 root `.gs` files | `node --check <file>.js` (copied from `.gs`) | **PASS** — all 14 files, 0 errors |
| Found & fixed: `DashboardService.gs` scope bug | `node --check` (before fix) | **FAILED before fix** (`SyntaxError: Unexpected token ')'`) → **PASS after fix** |
| Arabic-string audit (English-only requirement) | `grep` for Unicode range U+0600–U+06FF across `*.gs,*.html` | **PASS** — 0 matches outside deprecated `standalone-app.html` and pre-rebuild `dist/Code.gs` |
| Fake-data literal audit | `grep` for `Ahmed Hassan`, `New Cairo`, `Sheikh Zayed`, `U-0001`, `U-0002`, `mock` | **Found and fixed** — see `CLAUDE-LOCAL-IMPLEMENTATION-REPORT.md` §5 |
| Cloud Run / OAuth / token audit on `dist/` | `grep` for `ENV_BACKEND_URL`, `localStorage`, `Cloud Run`, `OAuth`, `Bearer`, `serviceAccount` | **PASS** — 0 matches in `dist/` |
| Build determinism | `node build-dist.js` run twice, `Get-FileHash` compared | **PASS** — identical SHA-256 for `dist/Code.gs`, `dist/Index.html`, `dist/appsscript.json` across two consecutive builds, both before and after all fixes |

## 2. Local simulation (Node.js, no Google APIs)

| Suite | Command | Passed | Failed | Notes |
|---|---|---|---|---|
| Unit tests | `node tests/unit-tests.js` | 44 | 0 | Naming rules, ID generation, validation, Work Category policy, PDF version invariants, bootstrap contract shape, XSS escaping, accessibility invariants |
| Integration simulation | `node tests/integration-simulation.js` | 7 | 0 | Drive editor-permission prerequisite, version transitions, PDF versioning, Decision C propagation + partial-failure resilience, single-round-trip bootstrap simulation, idempotent schema migration |
| **Total** | | **51** | **0** | Re-run after every source change; consistently 51/51 |
| `backend/tests/backend.test.js` | — | — | — | **Not Run** — tests the deprecated Cloud Run architecture, out of production scope |
| `frontend/tests/frontend.test.js` | — | — | — | **Not Run** — tests the deprecated GitHub Pages SPA, out of production scope |

These suites reimplement the naming/validation/dashboard logic in plain
Node.js; they do not load the actual `.gs` files into a JS VM, so they would
**not** have caught the `DashboardService.gs` scope bug (which only breaks
inside the real Apps Script module system). That bug was found by static
syntax-checking the actual file, not by these suites.

## 3. Browser testing (local harness only)

Tool: in-app Chromium browser pane, served via `tests/preview-server.js`
from `tests/.preview/` (built by `tests/build-preview.js`, which assembles
the real `Index.html` + `Client.html` + `Styles.html` exactly as
`build-dist.js` does, then injects `tests/preview-mocks.js` — a
`window._localMockDispatcher` that stands in for `google.script.run`).
This is the real production client code; only the server side is mocked.

| Area | What was checked | Result |
|---|---|---|
| Dashboard | Loads KPIs/breakdowns/recent activity from mock bootstrap; all labels English | PASS |
| Dashboard label wording | "Design PDFs" subtitle | **Found "Archived design plans" (misleading) → fixed to "Stored design files"** |
| Add Video — Project/Marketing toggle | Switches form sections | PASS |
| Add Video — Marketing/Educational | Selecting Content Type = Educational hides and clears Space Type | PASS (verified via DOM: field hidden, value cleared) |
| Video Library | Filters render with correct English options (stages, spaces, work categories, locations, unit types); table renders 2 fixture rows; pagination controls render | PASS |
| Video Library — action buttons | Preview / Open in Drive / Edit metadata / Add version / Version history all present, each with `title` and matching `aria-label` | PASS |
| Video Library — button size | Measured `offsetWidth`/`offsetHeight` in-browser | **Found 21-28px (below 40×40 minimum) → fixed to exactly 40×40, re-verified** |
| Video Preview modal | Opens with correct fixture title/Drive File ID; iframe `src` built from file ID | PASS |
| Video Preview — Escape to close | Pressed Escape; modal gained `hidden` class | PASS |
| Video Preview — iframe cleared on close | Checked `iframe.src` after close | PASS — reset to blank |
| Units & PDFs — unit cards | Renders fixture units with client/location/area/video/PDF counts | PASS |
| Units & PDFs — "View" button | Clicked programmatically; unit detail modal | **Found: did nothing (dead button — card's own click handler explicitly ignores clicks on any `<button>`, and "View" had no handler of its own) → fixed by adding an explicit `onclick`; re-verified modal now opens and populates correctly** |
| Unit Detail modal — fake-data-flash fix | Read `udClientName`/`udUnitIdBadge`/`udLocationType` immediately after opening, before the async response resolves | PASS — shows `—` / empty / "Loading…", never "Ahmed Hassan" / "U-0001" |
| Unit Detail modal — real data after load | Same fields after the mock response resolves | PASS — shows real fixture data ("[Test Fixture] Sample Client A", "TEST-U-0001", "New Cairo • Apartment (220 sqm)") |
| New Unit modal | Opens; native HTML5 `required` validation blocks empty submission (`form.checkValidity() === false`) | PASS |
| Settings | Renders connection status, config IDs, authorized users table, owner badge | PASS |
| Responsive — tablet (768×1024) | Screenshot review | PASS — nav wraps, KPI grid reflows to 2 columns, no horizontal overflow |
| Keyboard/Escape handling | Escape closes the open modal | PASS |

Screenshots were captured during this session (video preview modal, tablet
dashboard layout) but were not saved to disk as files, since the browser
tool renders them inline — the QA steps and their results above are the
durable record.

**Not covered in this pass** (time-boxed): Add Version modal full submit
flow, Edit Metadata rename-confirmation dialog, PDF upload flow, batch
rename confirmation screen, mobile (375px) viewport, focus-trap/focus-
restoration behavior in every modal. These follow the same patterns already
verified to work (delegated handlers, `Auth.requireAuth()` gating, the
`{ok,data,errorCode,message}` contract) but were not individually clicked
through.

## 4. Live Google integration

**Blocked — requires approved deployment.** None of the following were
performed, and none should be inferred from the above:
- Real Sheet persistence or real distinct-row counts from a live Spreadsheet.
- Real Drive file rename/move, or real "isn't shared with the app account"
  permission errors.
- Real `Session.getActiveUser()` identity resolution or `Authorised_Users`
  allowlist enforcement against a live Sheet.
- Real `LockService` concurrent-write behavior.
- Real Apps Script deployment permissions or `execute as` behavior.

See `LIVE-DEPLOYMENT-CHECKLIST.md` for the exact steps to perform these once
approved.

## 5. Summary

| Category | Passed | Failed | Blocked | Not Run |
|---|---|---|---|---|
| Static verification | 6/6 checks | 0 | 0 | 0 |
| Local simulation | 51 tests | 0 | 0 | 2 suites (deprecated architecture) |
| Browser testing | 18 checks | 0 (3 defects found *and fixed* during testing) | 0 | 5 flows (time-boxed) |
| Live Google integration | 0 | 0 | 5 categories | 0 |
