/**
 * Amlaak Video Library — Audit Service
 * Records audit logs for system security, tracking, and recovery.
 */

var AuditService = (function() {
  /**
   * Logs an action to the Audit Log sheet.
   */
  function log(action, entityType, entityId, driveFileId, result, errorCode, safeMessage) {
    try {
      var ssId = Config.getProperty(Config.KEYS.SPREADSHEET_ID);
      if (!ssId) return;

      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName(Config.TABS.AUDIT);
      if (!sheet) return;

      var userEmail = Auth.getCurrentUserEmail() || 'System';
      var timestamp = Utils.formatDateTime(new Date());

      var row = [
        timestamp,
        userEmail,
        action || '',
        entityType || '',
        entityId || '',
        driveFileId || '',
        result || 'SUCCESS',
        errorCode || '',
        safeMessage || ''
      ];

      sheet.appendRow(row);
    } catch (e) {
      Logger.log('Audit log error: ' + e.toString());
    }
  }

  function logSuccess(action, entityType, entityId, driveFileId, safeMessage) {
    log(action, entityType, entityId, driveFileId, 'SUCCESS', '', safeMessage);
  }

  function logFailure(action, entityType, entityId, driveFileId, errorCode, safeMessage) {
    log(action, entityType, entityId, driveFileId, 'FAILURE', errorCode, safeMessage);
  }

  return {
    log: log,
    logSuccess: logSuccess,
    logFailure: logFailure
  };
})();
