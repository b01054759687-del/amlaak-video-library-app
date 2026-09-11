# GitHub Pages landing page (prepared, not deployed)

`index.html` in this folder is the only file approved for publishing to the
`gh-pages` branch. It is a static, English/LTR page with Amlaak branding,
one button linking to the confirmed Apps Script `/exec` URL, and:

- No customer data
- No dashboard
- No forms
- No API calls
- No OAuth code
- No Sheet or Drive IDs

## To publish (not performed by this task)

1. Confirm the button's `href` still matches the current Apps Script
   deployment URL in `README.md`.
2. Replace the entire content of the `gh-pages` branch with this single
   `index.html` (the existing `gh-pages` branch content — the abandoned
   Cloud Run/OAuth frontend — should be removed, not merged with it).
3. Push only that change to `gh-pages`. Do not add any other file.

This task did not modify the remote `gh-pages` branch.
