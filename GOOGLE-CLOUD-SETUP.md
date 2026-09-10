# Google Cloud Setup & Configuration Guide

## 1. Google Cloud Project Setup
1. Create a dedicated project: `amlaak-video-prod` (or use existing).
2. Set billing account (ensure zero-cost alert is enabled for free-tier monitoring).

## 2. Required APIs
Enable the following APIs in GCP Console:
```bash
gcloud services enable \
  run.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com \
  iam.googleapis.com
```

## 3. Service Account & IAM Permissions
1. Create Service Account:
   ```bash
   gcloud iam service-accounts create amlaak-backend-sa \
     --display-name="Amlaak Video Backend Service Account"
   ```
2. Grant access to the Google Spreadsheet and Drive Folder:
   - Share Google Sheet (`1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4`) with `amlaak-backend-sa@...` as **Editor**.
   - Share Google Drive Root Folder (`172YFf4GteBT5x_WxQxr-ldo79f0XuRrh`) with `amlaak-backend-sa@...` as **Editor**.

## 4. Google Identity Services (OAuth 2.0 Web Client)
1. Go to **APIs & Services > Credentials**.
2. Create OAuth Client ID (Application type: **Web application**).
3. Authorized JavaScript Origins:
   - `https://b01054759687-del.github.io`
   - `http://localhost:3000`
   - `http://localhost:5173`
4. Copy the Client ID and add to frontend configuration.
