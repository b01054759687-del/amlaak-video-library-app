# Backend Setup & Cloud Run Guide

## 1. Directory Structure
```
backend/
├── Dockerfile              # Production container specification
├── .dockerignore           # Container build exclusions
├── package.json            # Node.js dependencies
├── src/
│   ├── config.js           # Environment variable validation
│   ├── server.js           # Native HTTP server and route dispatcher
│   ├── middleware/
│   │   ├── auth.js         # Bearer token verification and allowlist check
│   │   └── cors.js         # Strict CORS validation
│   ├── services/
│   │   ├── sheets.service.js   # Google Sheets repository
│   │   ├── drive.service.js    # Google Drive file operations
│   │   ├── unit.service.js     # Unit management and Decision C propagation
│   │   ├── video.service.js    # 22-step registration and naming rules
│   │   ├── pdf.service.js      # PDF upload and version flipping
│   │   └── dashboard.service.js# Analytical KPI aggregations
│   └── utils/
│       ├── naming.js       # Section 12 naming and Decision A enforcement
│       ├── response.js     # Standard API response formatting
│       └── validators.js   # Input validation rules
└── tests/
    └── backend.test.js     # Automated backend unit test suite
```

## 2. Local Execution
```bash
# Run automated backend test suite
node backend/tests/backend.test.js

# Start local server (requires configured .env)
node backend/src/server.js
```

## 3. Container Build (Docker)
```bash
docker build -t amlaak-video-backend:latest backend/
docker run -p 8080:8080 --env-file backend/.env amlaak-video-backend:latest
```
