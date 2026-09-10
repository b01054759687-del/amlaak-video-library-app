# Frontend Setup & Deployment Guide

## 1. Directory Structure
```
frontend/
├── index.html              # Main application entry point
├── package.json            # Vite & Tailwind build configuration
├── vite.config.js          # Build bundling configuration
├── tailwind.config.js      # Luxury design tokens configuration
├── postcss.config.js       # PostCSS plugins
├── src/
│   ├── api/
│   │   └── client.js       # REST client and legacy API dispatcher
│   ├── auth/
│   │   └── google-auth.js  # Google Identity Services client
│   ├── components/
│   │   ├── modals.js       # Accessible modal dialogs with focus trapping
│   │   └── toast.js        # Non-blocking notification toasts
│   ├── state/
│   │   └── store.js        # Reactive application store
│   ├── styles/
│   │   └── main.css        # Precompiled self-contained production CSS
│   └── main.js             # Client application engine
└── tests/
    └── frontend.test.js    # Automated ESM unit test suite
```

## 2. Local Testing & Standalone Review
The frontend contains a built-in mock dispatcher enabling full local review without requiring a live cloud backend:
1. Open `frontend/index.html` directly in any modern browser.
2. Click **Continue in Local Preview Mode** on the authentication dialog.
3. Test video registration, filtering, modal focus trapping, and PDF versioning.

## 3. Running Automated Tests
Run the standalone ESM test suite:
```bash
node frontend/tests/frontend.test.js
```

## 4. Deployment via GitHub Actions
GitHub Pages automatically deploys commits pushed to `main` via `.github/workflows/deploy-frontend.yml`.
