# Operations & Maintenance Guide

## 1. Monitoring & Logs
- **Cloud Run Logs**: View real-time request logs in GCP Cloud Logging:
  `gcloud beta run services logs tail amlaak-video-backend --region europe-west1`
- **Audit Sheet**: Check `Audit_Log` tab in Google Sheet for operational activity records.

## 2. Cost Control & Free Tier Compliance
- Cloud Run provides 2 million requests per month free under GCP Free Tier.
- Min instances set to `0` to eliminate idle compute costs.
- Container scales from zero on demand in under 1.5 seconds.
