/**
 * Audit Logging Service (§14, §15)
 */
const sheetsService = require('./sheets.service');

async function logAction(action, entityType, entityId, user, details = '') {
  await sheetsService.addAudit({
    action,
    entityType,
    entityId,
    user: user ? user.email : 'system',
    details,
    status: 'SUCCESS'
  });
}

async function logFailure(action, entityType, entityId, user, error) {
  await sheetsService.addAudit({
    action,
    entityType,
    entityId,
    user: user ? user.email : 'system',
    details: error.message || String(error),
    status: 'FAILURE'
  });
}

module.exports = { logAction, logFailure };
