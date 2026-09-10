# Amlaak Video Library — REST API Specification (v1)

Base URL: `https://<cloud-run-domain>/api/v1`

## 1. General Response Format
```json
{
  "ok": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "meta": { "timestamp": "2026-09-10T12:00:00Z" }
}
```

## 2. Endpoints

### 2.1. System Health
- **GET** `/health`
- **Auth**: None
- **Response**: `{ "ok": true, "data": { "status": "HEALTHY" } }`

### 2.2. App Bootstrap
- **GET** `/bootstrap`
- **Auth**: Required (Bearer ID Token)
- **Response**: Returns current user profile, lists (taxonomy), dashboard summary, and unit lookups.

### 2.3. Dashboard Analytics
- **GET** `/dashboard`
- **Query Params**: `timeRange`, `unitType`, `location`, `workCategory`
- **Response**: KPI summary cards, ranked space breakdown, recent video activity.

### 2.4. Units
- **GET** `/units`
- **POST** `/units`: Create new unit. Body: `{ clientName, location, unitType, area, notes }`
- **GET** `/units/:id`: Returns unit details, associated video list, and current/previous PDF drawings.
- **PATCH** `/units/:id`: Update unit metadata. Body: `{ fields: { ... }, executeBatchRename: boolean }`

### 2.5. Videos
- **GET** `/videos`: Filtered library search with pagination (`page`, `limit`, `query`, `category`).
- **POST** `/videos/project`: Register new Project Video.
- **POST** `/videos/marketing`: Register new Marketing Content.
- **POST** `/videos/version`: Register new version for existing video number.
- **GET** `/videos/:vNum/versions`: Retrieve version history sorted descending.
- **PATCH** `/videos/:driveId/metadata`: Update video metadata and trigger Drive rename if needed.

### 2.6. PDF Drawings
- **POST** `/pdfs`: Upload design drawing for a unit (promotes to V0X and Current, flips previous to Previous).
