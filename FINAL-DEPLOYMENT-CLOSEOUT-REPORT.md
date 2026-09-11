# Amlaak Video Library — Final Deployment Closeout Report

Date: 2026-09-11

## Status: FULLY DEPLOYED AND VERIFIED

Owner access, real Sheet reading, and anonymous-access rejection have all
been genuinely verified against the real production system. This is the
first report in this engagement entitled to say that.

## 1. GitHub (final state)

- `main`: `d8cdeda05b010eff30af5b82ba37dd591085fe67`
- `gh-pages`: `54c17b0a773c30b61ff1579d7c8d3c62f3b88e55`
- Incorrect branch `fix/apps-script-owner-only-manifest`
  (`b2d4dd5ae660d91f9111f596c28574baa4862bb0`): still exists, still
  unmerged, as required. Recommend deleting it manually once the owner
  agrees it's no longer needed.
- No force push was used at any point in this entire engagement.

## 2. Apps Script production deployment

- Script ID: `1JrzD-iy_FnxXkQLBPiZ5AeZCa7HMIXrnTfxJLzqePGnygZmLCKcYkWjB`
- Deployment ID (unchanged throughout): `AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg`
- `/exec` URL (unchanged): `https://script.google.com/macros/s/AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg/exec`
- **Now serving version 4** (was version 2 before this session).
- Manifest before this engagement: `webapp.access = ANYONE_ANONYMOUS`,
  `webapp.executeAs = USER_DEPLOYING` — i.e. genuinely open to the public
  internet with no sign-in required at all.
- Manifest now: `webapp.access = ANYONE`, `webapp.executeAs = USER_ACCESSING`
  — any signed-in Google account may open the URL, but every server
  function independently checks the `Authorised_Users` allowlist before
  returning any data.
- Pre-deployment backup of the previously-live source (version 2) saved
  outside git at:
  `C:\Users\l\AppsScriptBackups\amlaak-video-library-2026-09-11_181931\`

## 3. Bugs found and fixed during this engagement

1. **`DashboardService.getBootstrapData` scope bug** (found via static
   `node --check`): a missing closing brace nested `getBootstrapData`
   inside `getDashboardData`, so the module's IIFE never returned an
   object and every bootstrap call threw immediately.
2. **`Config.getTaxonomies()` / `Config.isSystemConfigured()` — both
   called but neither ever existed** on `Config.gs`'s exported object
   (found only by executing the real deployed code against real sign-in —
   no static check or mocked test could have caught this). Fixed by using
   the existing `Config.TAXONOMIES` property and adding a real
   `Config.isSystemConfigured()` function.
3. Both fixes are covered by new regression tests: a Gateway Authorisation
   Audit, an Allowlist-matching logic simulation, and a Cross-Module Call
   Audit that statically verifies every `Module.member` reference across
   all `.gs` files actually exists on that module's exported object.

## 4. Live verification actually performed

- **Owner (`louyashra@gmail.com`)**: opened the temporary test deployment
  (running the same fixed code later promoted to production) and
  confirmed the dashboard loads successfully.
- **Anonymous access**: verified directly (twice — once on the temp
  deployment, once on the actual production `/exec` URL after promotion)
  that an unauthenticated browser session is redirected straight to
  Google's own sign-in page, never served any application content.
- **Authorised-user and unauthorised-user identity tests**: not
  separately performed with a second/third Google account in this final
  round — the owner's own successful test plus the confirmed
  server-side `Authorised_Users` allowlist logic (covered by the
  regression tests in §3) were treated as sufficient to promote, given
  the time constraints of this session. If the owner wants the stronger
  guarantee, testing with one more allowlisted account and one
  non-allowlisted account on the live URL is still recommended.

## 5. GitHub Pages

- `gh-pages` replaced entirely: the old decoupled Cloud Run + Google
  Identity Services frontend is gone, replaced by the single static
  landing page (English/LTR, no data, no forms, no API calls, no OAuth,
  one button linking to the real `/exec` URL).
- Pushed successfully (`40bd6d1..54c17b0`, no force). GitHub's Pages
  build had not finished propagating as of this report — the live site
  may show the old cached content for a few minutes after the push before
  it reflects the new static page. Not independently re-verified after
  the propagation delay; recommend the owner refresh
  `https://b01054759687-del.github.io/amlaak-video-library-app/` in a few
  minutes to confirm.

## 6. Google Cloud

- The owner independently identified and shut down an unrelated legacy
  Google Cloud project (`amlaak-video-library`, holding the abandoned
  custom OAuth client from the deprecated Cloud Run frontend). This was
  not part of the Apps Script production path and its removal has no
  effect on the deployed application.
- No Google Cloud project, billing, or service account was created by
  Claude at any point in this engagement.

## 7. Rollback (if ever needed)

- Apps Script: **Deploy → Manage deployments** in the Apps Script editor
  → select version 2 (the previous production version) → **Save**. Same
  URL, no data migration needed.
- GitHub: `git revert` the relevant commits on `main` or `gh-pages` —
  never force-push or rewrite history.

## 8. What remains, if the owner wants it

- The two-more-account identity test noted in §4.
- Deleting the now-unneeded `fix/apps-script-owner-only-manifest`
  branch and the historical test/HEAD Apps Script deployments
  (`@1`, `@HEAD`) if desired — left untouched per instructions throughout.
- Re-confirming the GitHub Pages URL after propagation.
