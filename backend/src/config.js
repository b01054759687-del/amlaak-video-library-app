/**
 * Amlaak Video Library — Backend Configuration
 */
const path = require('path');
try { require('dotenv').config(); } catch (e) {}

module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'production',
  SPREADSHEET_ID: process.env.SPREADSHEET_ID || '1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4',
  ROOT_FOLDER_ID: process.env.ROOT_FOLDER_ID || '172YFf4GteBT5x_WxQxr-ldo79f0XuRrh',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'amlaak-video-library.apps.googleusercontent.com',
  TIMEZONE: process.env.TIMEZONE || 'Africa/Cairo',
  ALLOWED_ORIGINS: [
    'https://b01054759687-del.github.io',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'] : [])
  ],
  MAX_PDF_SIZE_BYTES: 25 * 1024 * 1024 // 25 MB
};
