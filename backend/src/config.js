/**
 * Amlaak Video Library — Backend Configuration
 */
const path = require('path');
try { require('dotenv').config(); } catch (e) {}

const NODE_ENV = process.env.NODE_ENV || 'development';
const DATA_ADAPTER = (process.env.DATA_ADAPTER || (NODE_ENV === 'production' ? 'google' : 'mock')).toLowerCase();

if (NODE_ENV === 'production' && DATA_ADAPTER !== 'google') {
  throw new Error('FATAL CONFIGURATION ERROR: Production backend must use DATA_ADAPTER=google. In-memory adapters are strictly forbidden in production.');
}

module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: NODE_ENV,
  DATA_ADAPTER: DATA_ADAPTER,
  GIT_COMMIT_SHA: process.env.GIT_COMMIT_SHA || 'b0a4031',
  SPREADSHEET_ID: process.env.SPREADSHEET_ID || '1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4',
  ROOT_FOLDER_ID: process.env.ROOT_FOLDER_ID || '172YFf4GteBT5x_WxQxr-ldo79f0XuRrh',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  TIMEZONE: process.env.TIMEZONE || 'Africa/Cairo',
  ALLOWED_ORIGINS: [
    'https://b01054759687-del.github.io',
    ...(NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'] : [])
  ],
  MAX_PDF_SIZE_BYTES: 25 * 1024 * 1024 // 25 MB
};
