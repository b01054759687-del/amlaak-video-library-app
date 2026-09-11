/**
 * Amlaak Video Library — Utility Functions
 * Date formatting, locking, safe responses, string sanitization, and ID formatting.
 */

var Utils = (function() {
  function successResponse(data, message) {
    return {
      ok: true,
      data: data || null,
      message: message || '',
      errorCode: null,
      timestamp: new Date().toISOString()
    };
  }

  function errorResponse(errorCode, message, optData) {
    return {
      ok: false,
      data: optData || null,
      message: message || 'An error occurred while processing the request.',
      errorCode: errorCode || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  function formatDate(date, formatPattern) {
    if (!date) return '';
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var tz = Config.getTimezone();
    var pattern = formatPattern || 'yyyy-MM-dd';
    try {
      return Utilities.formatDate(d, tz, pattern);
    } catch (e) {
      return d.toISOString().split('T')[0];
    }
  }

  function formatDateTime(date) {
    return formatDate(date, 'yyyy-MM-dd HH:mm:ss');
  }

  function normalizeDateString(dateStr) {
    if (!dateStr) return '';
    var str = String(dateStr).trim();
    // Match yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      return formatDate(d, 'yyyy-MM-dd');
    }
    return str;
  }

  /**
   * Sanitises filename characters according to OS and Google Drive standards.
   * Removes /\:*?"<>| and cleans redundant spaces/hyphens without breaking date formats (YYYY-MM-DD).
   */
  function sanitizeFilename(filename) {
    if (!filename) return '';
    var clean = String(filename)
      .replace(/[\\/:*?"<>|]/g, '') // remove unsafe chars
      .replace(/[\x00-\x1f\x80-\x9f]/g, '') // remove control chars
      .replace(/\s+/g, ' ') // collapse multi spaces
      .replace(/\s*-\s*-\s*/g, ' - ') // collapse multi dashes
      .replace(/\s+-\s*|\s*-\s+/g, ' - ') // normalize dashes that have spaces
      .replace(/( - ){2,}/g, ' - ') // collapse duplicate separators
      .replace(/^[\s\-]+|[\s\-]+$/g, '') // trim leading/trailing dashes and spaces
      .trim();
    return clean;
  }

  /**
   * Executes a callback within a ScriptLock.
   */
  function withLock(timeoutMs, callback) {
    var lock = LockService.getScriptLock();
    var ms = timeoutMs || 30000;
    var acquired = false;
    try {
      acquired = lock.tryLock(ms);
      if (!acquired) {
        throw new Error('Could not acquire the processing lock (timeout) — another operation is currently in progress.');
      }
      return callback();
    } finally {
      if (acquired) {
        try {
          lock.releaseLock();
        } catch (e) {
          // ignore release error
        }
      }
    }
  }

  function padZero(num, size) {
    var s = String(num);
    while (s.length < (size || 4)) s = '0' + s;
    return s;
  }

  function formatVideoNumber(num) {
    return padZero(num, 4);
  }

  function formatVersionNumber(num) {
    var n = parseInt(num, 10) || 1;
    return 'V' + (n < 10 ? '0' + n : String(n));
  }

  function formatUnitId(seq) {
    return 'U-' + padZero(seq, 4);
  }

  function formatPdfNumber(num) {
    return 'PDF-' + padZero(num, 4);
  }

  function formatPdfRecordId(unitId, versionNum) {
    var cleanUnit = String(unitId || '').replace(/[^a-zA-Z0-9]/g, '');
    return 'DOC-' + cleanUnit + '-' + formatVersionNumber(versionNum);
  }

  /**
   * Normalizes location string: trims, collapses whitespace, ensures casing consistency
   */
  function normalizeLocation(loc) {
    if (!loc) return '';
    return String(loc)
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Prevents formula/CSV injection when writing free-text values into Sheets.
   * A leading =, +, -, @, tab, or CR causes Sheets to parse the value as a
   * formula even via the API, so such values are prefixed with a leading
   * apostrophe to force plain-text storage. Non-string values pass through.
   */
  function sanitizeForSheet(value) {
    if (typeof value !== 'string') return value;
    if (/^[=+\-@\t\r]/.test(value)) {
      return "'" + value;
    }
    return value;
  }

  return {
    successResponse: successResponse,
    errorResponse: errorResponse,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    normalizeDateString: normalizeDateString,
    sanitizeFilename: sanitizeFilename,
    withLock: withLock,
    padZero: padZero,
    formatVideoNumber: formatVideoNumber,
    formatVersionNumber: formatVersionNumber,
    formatUnitId: formatUnitId,
    formatPdfNumber: formatPdfNumber,
    formatPdfRecordId: formatPdfRecordId,
    normalizeLocation: normalizeLocation,
    sanitizeForSheet: sanitizeForSheet
  };
})();
