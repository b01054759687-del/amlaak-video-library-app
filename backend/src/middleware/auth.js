/**
 * Server-Side Google OAuth Token Verification & Allowlist Enforcement (§9)
 */
const { error } = require('../utils/response');
const sheetsService = require('../services/sheets.service');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const mockUserHeader = req.headers['x-mock-user'];

    let verifiedEmail = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7).trim();
      
      // Try Google OAuth token verification if google-auth-library is available
      try {
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
          idToken: idToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (payload && payload.email && payload.email_verified) {
          verifiedEmail = payload.email.toLowerCase();
        }
      } catch (tokenErr) {
        // If testing token or mock environment
        if (process.env.NODE_ENV !== 'production' && idToken.startsWith('test-token-')) {
          verifiedEmail = idToken.replace('test-token-', '').toLowerCase();
        }
      }
    } else if (process.env.NODE_ENV !== 'production' && mockUserHeader) {
      verifiedEmail = mockUserHeader.toLowerCase();
    }

    if (!verifiedEmail) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(error('UNAUTHORIZED', 'Authentication token missing, invalid or expired.')));
      return;
    }

    // Server-side allowlist enforcement from Sheet (§9)
    const users = await sheetsService.getAuthorisedUsers();
    const matched = users.find(u => u.email.toLowerCase() === verifiedEmail && u.isAuthorized);

    if (!matched) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(error('FORBIDDEN', 'User is not authorised on the system allowlist: ' + verifiedEmail)));
      return;
    }

    req.user = {
      email: matched.email,
      role: matched.role || 'Authorised User',
      isAuthorized: true
    };

    next();
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(error('AUTH_ERROR', 'Internal authentication error: ' + err.message)));
  }
}

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'System Owner') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(error('OWNER_REQUIRED', 'Access Denied: This operation is restricted to the System Owner.')));
    return;
  }
  next();
}

module.exports = { authMiddleware, requireOwner };
