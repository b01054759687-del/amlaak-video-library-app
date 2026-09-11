# GitHub Pages Deployment & Repository Plan Guide

> **⚠️ DEPRECATED — NOT THE OPERATIONAL APPLICATION.** GitHub Pages is not
> the data application (see `ARCHITECTURE.md`). The only sanctioned use of
> GitHub Pages is the minimal static landing page described in
> `docs/landing-page/` — English/LTR, no forms, no API calls, no OAuth, no
> Sheet/Drive IDs, one button linking to the real Apps Script `/exec` URL.
> Everything below this banner describes the earlier, abandoned
> decoupled-frontend plan and is kept for audit history only.

## 1. GitHub Account & Repository Plan Gate
GitHub Pages hosting behavior depends on repository visibility:
- **Public Repositories**: Supported on GitHub Free.
- **Private Repositories**: Supported on GitHub Pro, Team, or Enterprise accounts.

### Plan Decision Options:
1. **Option A (Recommended for private enterprise IP)**: Upgrade to GitHub Pro ($4/month) to enable GitHub Pages directly on the private repository without exposing code.
2. **Option B (Free static host)**: Connect frontend repository to **Cloudflare Pages** or **Firebase Hosting** (both free for private GitHub repos).
3. **Option C (Public Frontend)**: Convert repository to public, or split frontend code into a dedicated public repository.

## 2. GitHub Pages Configuration
In GitHub Repository:
1. Go to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to `main` branch triggers `.github/workflows/deploy-frontend.yml`.
