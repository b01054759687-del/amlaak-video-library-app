# Authentication & Authorization Specification

## 1. Authentication Lifecycle
1. User navigates to GitHub Pages application.
2. Google Identity Services (GIS) loads asynchronously.
3. User signs in via Google prompt.
4. Client receives signed Google ID Token (JWT).
5. Token is passed in `Authorization: Bearer <ID_TOKEN>` header for all backend API requests.

## 2. Backend Token Verification
- Signature verified against Google's public keys via `OAuth2Client.verifyIdToken()`.
- Audience (`aud`) verified against configured Client ID.
- Expiration (`exp`) verified against current time.
- Email address extracted and matched against `Authorised_Users` sheet.

## 3. Role Hierarchy
- **System Owner**: `louyashra@gmail.com` (Full administrative control, schema configuration).
- **Authorised Editor**: Allowlisted team members (Read/write operations on videos and units).
- **Unlisted**: HTTP 403 Forbidden.
