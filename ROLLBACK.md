# Rollback & Business Continuity Procedure

## 1. Existing Fallback Web App
The existing Google Apps Script deployment remains permanently preserved as an emergency fallback:
- **Deployment URL**: `https://script.google.com/macros/s/AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg/exec`
- **Project ID**: `1JrzD-iy_FnxXkQLBPiZ5AeZCa7HMIXrnTfxJLzqePGnygZmLCKcYkWjB`
- **Preserved Bundle**: `dist/` and `D:\AntigravityExports\AMLAAK-GITHUB-MIGRATION\apps-script-snapshot/`

## 2. Rollback Execution Steps
If a production issue occurs during or after GitHub Pages cutover:
1. Direct team members to open the existing Apps Script Web App URL.
2. The Google Sheet and Drive IDs are identical; no data migration is necessary.
3. Revert DNS or GitHub repository settings as needed.
4. Apps Script web app operates completely independently of Cloud Run.
