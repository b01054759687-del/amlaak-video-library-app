# Amlaak Video Library — System Architecture & Production Design

## 1. Overview & High-Level Topology
The Amlaak Video Library is an enterprise-grade engineering media archive decoupled into a high-performance static frontend hosted on **GitHub Pages** and an autoscaling, secure backend container hosted on **Google Cloud Run**.

```
[ User Browser (Mobile / Desktop) ]
                 |
                 | (HTTPS / TLS 1.3)
                 v
     +-----------------------+
     |  GitHub Pages CDN     |  <-- Static Assets (HTML/CSS/JS, zero build runtime)
     +-----------------------+
                 |
                 | REST API Requests (Bearer JWT)
                 v
     +-----------------------+
     |   Google Cloud Run    |  <-- Node.js Universal Server (Containerized)
     |  (amlaak-video-api)   |  <-- Token Verification + Authorised_Users Check
     +-----------------------+
            |         |
            |         +----------------------------------+
            v                                            v
+------------------------+                   +------------------------+
| Google Sheets Database |                   |   Google Drive Store   |
| (1KLsNGiIGSyd...gzZ4)  |                   | (172YFf4GteBT...uRrh)  |
| - Videos / Units / Log |                   | - Project Videos       |
| - Authorised_Users     |                   | - Unit PDF Versions    |
+------------------------+                   +------------------------+
```

---

## 2. Component Breakdown

### 2.1. Frontend Layer (GitHub Pages)
- **Host**: GitHub Pages (`https://b01054759687-del.github.io/amlaak-video-library-app/`)
- **Language & Layout**: Pure English (`lang="en" dir="ltr"`).
- **Styling**: Precompiled standalone luxury CSS (`src/styles/main.css`), 100% self-contained without Play CDN.
- **Authentication**: Google Identity Services (GIS) Web SDK client-side token acquisition.
- **State Store**: Reactive in-memory state with sequence tokens (`searchRequestId`) to eliminate stale async race conditions.

### 2.2. Backend API Layer (Google Cloud Run)
- **Runtime**: Containerized Node.js runtime (`backend/Dockerfile`).
- **Authentication**: Verifies Google ID tokens using `google-auth-library` and cross-references email against the `Authorised_Users` sheet tab.
- **CORS Protection**: Enforces origin restrictions against unauthorized web origins.
- **Data Access**: Connects to Google Sheets API v4 and Google Drive API v3 via Application Default Credentials (ADC) or Service Account key.

### 2.3. Storage & Persistence
- **Google Sheets ID**: `1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4` (Exclusive source of truth for metadata, taxonomy, and access controls).
- **Google Drive Root Folder ID**: `172YFf4GteBT5x_WxQxr-ldo79f0XuRrh` (Exclusive physical file repository for video versions and PDF drawings).

---

## 3. Request Lifecycle & Security Perimeter
1. **Unauthenticated Access**: Requests to `/api/v1/health` return server readiness. All other routes require an `Authorization: Bearer <ID_TOKEN>` header.
2. **Identity Verification**:
   - Backend extracts token, validates cryptographic signature with Google public certificates.
   - Extracts verified email address.
   - Validates that email exists in `Authorised_Users` with `Status = Active`.
3. **Authorization Roles**:
   - `Owner` (`louyashra@gmail.com`): Access to all endpoints, including system configuration and setup.
   - `Authorised User` (Editor): Access to video library, units, upload, and metadata editing.
4. **Execution & Auditing**:
   - Every state-changing action logs an entry in the `Audit_Log` sheet tab with timestamp, actor email, and action details.
