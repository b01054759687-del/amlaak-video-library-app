# Rollback Procedure

The Apps Script Web App **is** the production application (see
`ARCHITECTURE.md`). "Rollback" here means reverting to a previously known-good
Apps Script deployment version, not switching architectures.

## 1. Before pushing a new `dist/`

Apps Script deployments are versioned. Before updating the existing
deployment (`AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg`),
note the currently active deployment/version in the Apps Script editor
(**Deploy → Manage deployments**) so it can be restored.

## 2. Rollback steps

1. Open the Apps Script project (Script ID
   `1JrzD-iy_FnxXkQLBPiZ5AeZCa7HMIXrnTfxJLzqePGnygZmLCKcYkWjB`) in the Apps
   Script editor.
2. **Deploy → Manage deployments** → select the web app deployment → choose
   the previously active version number → **Save**.
3. Reload the `/exec` URL and confirm the dashboard loads and shows the
   expected data (smoke test per `LIVE-DEPLOYMENT-CHECKLIST.md`).
4. The Google Sheet (`1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4`) and
   Drive root folder (`172YFf4GteBT5x_WxQxr-ldo79f0XuRrh`) are unaffected by
   a code rollback — no data migration is ever required for this step.

## 3. If the Sheet schema itself needs to be reverted

`Setup.gs`'s migration is additive and idempotent (it only adds missing
headers). It does not delete or reorder columns, so a code rollback does not
require a schema rollback. If a bad row was written by a broken deployment,
remove it manually in Sheets after confirming with the owner — this task
does not perform that removal (see `CLAUDE-LOCAL-IMPLEMENTATION-REPORT.md`,
section on data integrity).

## Deprecated architectures — no rollback path needed

The Cloud Run / GitHub Pages / custom-OAuth experiment (`backend/`,
`frontend/`, `gh-pages` branch) was never the production path and requires
no rollback procedure; it is not deployed anywhere.
