/**
 * Amlaak Video Library — Drive Service Factory (§9)
 */
const config = require('../config');

const adapterType = (process.env.DATA_ADAPTER || (config.NODE_ENV === 'production' ? 'google' : 'mock')).toLowerCase();

if (config.NODE_ENV === 'production' && adapterType !== 'google') {
  throw new Error('FATAL CONFIGURATION ERROR: Production backend must use DATA_ADAPTER=google. In-memory adapters are strictly forbidden in production.');
}

console.log(`[DriveService] Initialized with adapter: ${adapterType}`);

let instance;
if (adapterType === 'google') {
  const GoogleDriveService = require('./drive.google');
  instance = new GoogleDriveService();
} else {
  const MockDriveService = require('./drive.mock');
  instance = new MockDriveService();
}

module.exports = instance;
