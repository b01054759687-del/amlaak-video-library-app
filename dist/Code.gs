/**
 * Amlaak Video Library — Bundled Production Engine v2.0
 * Auto-generated bundle for instant single-file Apps Script deployment.
 */

// ==========================================
// FILE: Config.gs
// ==========================================
/**
 * Amlaak Video Library — Configuration & Global Constants
 * Manages system properties, sheet tab definitions, and controlled taxonomies.
 */

var Config = (function() {
  var PROPERTY_KEYS = {
    SPREADSHEET_ID: 'SPREADSHEET_ID',
    ROOT_FOLDER_ID: 'ROOT_FOLDER_ID',
    PROJECT_VIDEOS_FOLDER_ID: 'PROJECT_VIDEOS_FOLDER_ID',
    MARKETING_CONTENT_FOLDER_ID: 'MARKETING_CONTENT_FOLDER_ID',
    UNIT_DESIGN_PDFS_FOLDER_ID: 'UNIT_DESIGN_PDFS_FOLDER_ID',
    TIMEZONE: 'TIMEZONE',
    SYSTEM_INITIALIZED: 'SYSTEM_INITIALIZED'
  };

  var TABS = {
    UNITS: 'Units',
    VIDEOS: 'Video Versions',
    PDFS: 'Unit Design PDFs',
    LISTS: 'Lists',
    USERS: 'Authorised Users',
    AUDIT: 'Audit Log',
    CONFIG: 'System Config'
  };

  var FOLDERS = {
    ROOT: 'Amlaak Video Library',
    PROJECT_VIDEOS: 'Project Videos',
    MARKETING_CONTENT: 'Marketing Content',
    UNIT_DESIGN_PDFS: 'Unit Design PDFs'
  };

  // Section 8 Approved Taxonomies
  var DEFAULT_TAXONOMIES = {
    videoSource: [
      'Project Video',
      'Marketing Content'
    ],
    unitType: [
      'Apartment',
      'Studio',
      'Duplex',
      'Penthouse',
      'Roof Apartment',
      'Standalone Villa',
      'Twin House',
      'Townhouse',
      'Chalet',
      'Cabin',
      'Office',
      'Clinic',
      'Retail / Commercial Unit',
      'Restaurant / Café',
      'Other'
    ],
    projectVideoType: [
      'Red Brick',
      'Phase 1',
      'Phase 2',
      'Final',
      'Final with Furniture',
      'Client Interview',
      'Before & After'
    ],
    spaceType: [
      'Full Unit',
      'Reception',
      'Kitchen',
      'Bathroom',
      'Bedroom',
      'Dressing Room',
      'Entrance',
      'Terrace',
      'Garden',
      'Multiple Spaces',
      'Other'
    ],
    marketingContentType: [
      'Educational',
      'Demonstration',
      'Testimonial',
      'Sales',
      'Offer',
      'Other'
    ],
    // Section 8.6 Work Category (Decision A - Confirmed separate field)
    workCategory: [
      'Roof',
      'Ceiling',
      'Materials',
      'Furniture',
      'Decoration',
      'HDF',
      'Ceramics',
      'Electrical',
      'Gypsum Board',
      'Air Conditioning',
      'Sound System',
      'Doors',
      'Windows',
      'Painting',
      'Plastering'
    ]
  };

  function getProperty(key, optDefault) {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    if (val !== null && val !== undefined && val !== '') return val;
    // Default configured production resources
    if (key === PROPERTY_KEYS.SPREADSHEET_ID) return '1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4';
    if (key === PROPERTY_KEYS.ROOT_FOLDER_ID) return '172YFf4GteBT5x_WxQxr-ldo79f0XuRrh';
    return (optDefault || '');
  }

  function setProperty(key, value) {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(key, String(value));
  }

  function setProperties(obj) {
    var props = PropertiesService.getScriptProperties();
    props.setProperties(obj);
  }

  function getAllProperties() {
    var props = PropertiesService.getScriptProperties();
    return props.getProperties();
  }

  function isSystemConfigured() {
    return !!(getProperty(PROPERTY_KEYS.SPREADSHEET_ID) && getProperty(PROPERTY_KEYS.ROOT_FOLDER_ID));
  }

  return {
    KEYS: PROPERTY_KEYS,
    TABS: TABS,
    FOLDERS: FOLDERS,
    TAXONOMIES: DEFAULT_TAXONOMIES,
    getProperty: getProperty,
    setProperty: setProperty,
    setProperties: setProperties,
    getAllProperties: getAllProperties,
    isSystemConfigured: isSystemConfigured,
    getTimezone: function() {
      return getProperty(PROPERTY_KEYS.TIMEZONE, 'Africa/Cairo');
    }
  };
})();


// ==========================================
// FILE: Utils.gs
// ==========================================
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


// ==========================================
// FILE: Validators.gs
// ==========================================
/**
 * Amlaak Video Library — Validation Engine
 * Server-side input validation and error code assignment.
 */

var Validators = (function() {
  /**
   * Extracts Google Drive File ID from various URL patterns or raw ID string.
   */
  function extractDriveFileId(urlOrId) {
    if (!urlOrId) return '';
    var input = String(urlOrId).trim();

    // Pattern 1: /file/d/FILE_ID/
    var match = input.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) return match[1];

    // Pattern 2: id=FILE_ID
    match = input.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) return match[1];

    // Pattern 3: /d/FILE_ID/
    match = input.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) return match[1];

    // Pattern 4: Raw file ID (alphanumeric, underscores, dashes, length 25-50)
    if (/^[a-zA-Z0-9_-]{25,50}$/.test(input)) {
      return input;
    }

    return '';
  }

  function validateProjectVideo(payload) {
    var errors = [];

    if (!payload.videoLink || !extractDriveFileId(payload.videoLink)) {
      errors.push({ field: 'videoLink', message: 'Invalid Google Drive link, or no valid File ID could be found.' });
    }

    if (!payload.clientName || !String(payload.clientName).trim()) {
      errors.push({ field: 'clientName', message: 'Client name is required.' });
    }

    if (!payload.location || !String(payload.location).trim()) {
      errors.push({ field: 'location', message: 'Location is required.' });
    }

    if (!payload.unitType || !String(payload.unitType).trim()) {
      errors.push({ field: 'unitType', message: 'Unit type is required.' });
    } else if (Config.TAXONOMIES.unitType.indexOf(payload.unitType) === -1) {
      errors.push({ field: 'unitType', message: 'The selected unit type is not in the approved list.' });
    }

    if (payload.area !== undefined && payload.area !== null && String(payload.area).trim() !== '') {
      var num = Number(payload.area);
      if (isNaN(num) || num <= 0) {
        errors.push({ field: 'area', message: 'Area (sqm) must be a positive number.' });
      }
    }

    if (!payload.projectVideoType || !String(payload.projectVideoType).trim()) {
      errors.push({ field: 'projectVideoType', message: 'Project Video Type is required.' });
    } else if (Config.TAXONOMIES.projectVideoType.indexOf(payload.projectVideoType) === -1) {
      errors.push({ field: 'projectVideoType', message: 'The selected Project Video Type is not in the approved list.' });
    }

    if (!payload.spaceType || !String(payload.spaceType).trim()) {
      errors.push({ field: 'spaceType', message: 'Space Type is required.' });
    } else if (Config.TAXONOMIES.spaceType.indexOf(payload.spaceType) === -1) {
      errors.push({ field: 'spaceType', message: 'The selected Space Type is not in the approved list.' });
    }

    // Section 8.6 Work Category (Decision A - Confirmed)
    if (!payload.workCategory || !String(payload.workCategory).trim()) {
      errors.push({ field: 'workCategory', message: 'Work Category is required.' });
    } else if (Config.TAXONOMIES.workCategory.indexOf(payload.workCategory) === -1) {
      errors.push({ field: 'workCategory', message: 'The selected Work Category is not in the approved list.' });
    }

    if (!payload.shootingDate || !Utils.normalizeDateString(payload.shootingDate)) {
      errors.push({ field: 'shootingDate', message: 'Shooting Date is required in a valid format (YYYY-MM-DD).' });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  function validateMarketingContent(payload) {
    var errors = [];

    if (!payload.videoLink || !extractDriveFileId(payload.videoLink)) {
      errors.push({ field: 'videoLink', message: 'Invalid Google Drive link, or no valid File ID could be found.' });
    }

    if (!payload.contentType || !String(payload.contentType).trim()) {
      errors.push({ field: 'contentType', message: 'Content Type is required.' });
    } else if (Config.TAXONOMIES.marketingContentType.indexOf(payload.contentType) === -1) {
      errors.push({ field: 'contentType', message: 'The selected Content Type is not in the approved list.' });
    }

    if (!payload.topic || !String(payload.topic).trim()) {
      errors.push({ field: 'topic', message: 'Topic is required.' });
    }

    if (!payload.shootingDate || !Utils.normalizeDateString(payload.shootingDate)) {
      errors.push({ field: 'shootingDate', message: 'Shooting Date is required in a valid format (YYYY-MM-DD).' });
    }

    // Educational content must not have Space Type
    if (payload.contentType === 'Educational' && payload.spaceType && String(payload.spaceType).trim()) {
      // automatically cleared rather than hard error, but flag if unexpected
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  function validateUnit(payload) {
    var errors = [];

    if (!payload.clientName || !String(payload.clientName).trim()) {
      errors.push({ field: 'clientName', message: 'Client name is required.' });
    }

    if (!payload.location || !String(payload.location).trim()) {
      errors.push({ field: 'location', message: 'Location is required.' });
    }

    if (!payload.unitType || !String(payload.unitType).trim()) {
      errors.push({ field: 'unitType', message: 'Unit type is required.' });
    }

    if (payload.area !== undefined && payload.area !== null && String(payload.area).trim() !== '') {
      var num = Number(payload.area);
      if (isNaN(num) || num <= 0) {
        errors.push({ field: 'area', message: 'Area (sqm) must be a positive number.' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  var MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB documented maximum limit

  function validatePdfUpload(payload) {
    var errors = [];

    if (!payload.unitId || !String(payload.unitId).trim()) {
      errors.push({ field: 'unitId', message: 'Unit ID is required to link the design file.' });
    }

    if (!payload.base64Content && !payload.driveLink) {
      errors.push({ field: 'file', message: 'A PDF file or Drive link is required.' });
    }

    if (payload.fileName && !payload.fileName.toLowerCase().endsWith('.pdf')) {
      errors.push({ field: 'fileName', message: 'The uploaded file must have a .pdf extension.' });
    }

    if (payload.mimeType && payload.mimeType !== 'application/pdf') {
      errors.push({ field: 'mimeType', message: 'Invalid file type (must be application/pdf).' });
    }

    if (payload.fileSize && Number(payload.fileSize) > MAX_PDF_SIZE_BYTES) {
      errors.push({ field: 'fileSize', message: 'PDF file size exceeds the maximum allowed (25 MB).' });
    }

    if (payload.base64Content) {
      var approxRawBytes = Math.round(payload.base64Content.length * 0.75);
      if (approxRawBytes > MAX_PDF_SIZE_BYTES) {
        errors.push({ field: 'fileSize', message: 'PDF file size exceeds the maximum allowed (25 MB).' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  return {
    extractDriveFileId: extractDriveFileId,
    validateProjectVideo: validateProjectVideo,
    validateMarketingContent: validateMarketingContent,
    validateUnit: validateUnit,
    validatePdfUpload: validatePdfUpload
  };
})();


// ==========================================
// FILE: NamingService.gs
// ==========================================
/**
 * Amlaak Video Library — Naming Service
 * Generates standardized filenames according to Section 12 rules.
 */

var NamingService = (function() {
  /**
   * Extracts file extension from a filename or link.
   * Defaults to 'mp4' if unknown.
   */
  function extractExtension(filename) {
    if (!filename) return 'mp4';
    var clean = String(filename).trim();
    var lastDot = clean.lastIndexOf('.');
    if (lastDot !== -1 && lastDot < clean.length - 1) {
      var ext = clean.substring(lastDot + 1).toLowerCase();
      // Only keep alphanumeric characters up to 5 chars
      ext = ext.replace(/[^a-z0-9]/g, '');
      if (ext.length > 0 && ext.length <= 5) return ext;
    }
    return 'mp4';
  }

  /**
   * Generates Project Video filename:
   * Client Name - Location - Project Video Type - Space Type - Shooting Date - Version Number.ext
   * Omit empty optional fields without leaving duplicate separators.
   * Work Category is NOT included in the filename per Section 12.
   */
  function generateProjectVideoName(metadata) {
    var clientName = (metadata.clientName || '').trim();
    var location = (metadata.location || '').trim();
    var projectVideoType = (metadata.projectVideoType || '').trim();
    var spaceType = (metadata.spaceType || '').trim();
    var shootingDate = Utils.normalizeDateString(metadata.shootingDate || '');
    var versionStr = Utils.formatVersionNumber(metadata.versionNumber || 1);
    var ext = extractExtension(metadata.originalFileName || metadata.extension || 'mp4');

    var parts = [];
    if (clientName) parts.push(clientName);
    if (location) parts.push(location);
    if (projectVideoType) parts.push(projectVideoType);
    if (spaceType) parts.push(spaceType);
    if (shootingDate) parts.push(shootingDate);
    if (versionStr) parts.push(versionStr);

    var baseName = parts.join(' - ');
    var sanitizedBase = Utils.sanitizeFilename(baseName);
    return sanitizedBase + '.' + ext;
  }

  /**
   * Generates Marketing Content filename:
   * With Space Type: Content Type - Topic - Space Type - Shooting Date - Version Number.ext
   * Without Space Type: Content Type - Topic - Shooting Date - Version Number.ext
   */
  function generateMarketingContentName(metadata) {
    var contentType = (metadata.contentType || '').trim();
    var topic = (metadata.topic || '').trim();
    var spaceType = (metadata.spaceType || '').trim();
    var shootingDate = Utils.normalizeDateString(metadata.shootingDate || '');
    var versionStr = Utils.formatVersionNumber(metadata.versionNumber || 1);
    var ext = extractExtension(metadata.originalFileName || metadata.extension || 'mp4');

    // Educational content hides and omits Space Type per Section 11 & 12
    if (contentType.toLowerCase() === 'educational') {
      spaceType = '';
    }

    var parts = [];
    if (contentType) parts.push(contentType);
    if (topic) parts.push(topic);
    if (spaceType) parts.push(spaceType);
    if (shootingDate) parts.push(shootingDate);
    if (versionStr) parts.push(versionStr);

    var baseName = parts.join(' - ');
    var sanitizedBase = Utils.sanitizeFilename(baseName);
    return sanitizedBase + '.' + ext;
  }

  /**
   * Generates Unit Design PDF filename:
   * Client Name - Location - Design - Version Number.pdf
   */
  function generateUnitPdfName(metadata) {
    var clientName = (metadata.clientName || '').trim();
    var location = (metadata.location || '').trim();
    var docTitle = (metadata.documentTitle || 'Architectural Design').trim();
    var versionStr = Utils.formatVersionNumber(metadata.versionNumber || metadata.pdfVersionNumber || 1);
    var ext = 'pdf';

    var parts = [];
    if (clientName) parts.push(clientName);
    if (location) parts.push(location);
    if (docTitle) parts.push(docTitle);
    if (versionStr) parts.push(versionStr);

    var baseName = parts.join(' - ');
    var sanitizedBase = Utils.sanitizeFilename(baseName);
    return sanitizedBase + '.' + ext;
  }

  function generateFilename(sourceType, metadata) {
    if (sourceType === 'Project Video' || metadata.videoSource === 'Project Video') {
      return generateProjectVideoName(metadata);
    } else if (sourceType === 'Marketing Content' || metadata.videoSource === 'Marketing Content') {
      return generateMarketingContentName(metadata);
    } else if (sourceType === 'PDF' || metadata.isPdf) {
      return generateUnitPdfName(metadata);
    }
    return Utils.sanitizeFilename(metadata.originalFileName || 'file.mp4');
  }

  return {
    extractExtension: extractExtension,
    generateProjectVideoName: generateProjectVideoName,
    generateMarketingContentName: generateMarketingContentName,
    generateUnitPdfName: generateUnitPdfName,
    generateFilename: generateFilename
  };
})();


// ==========================================
// FILE: Auth.gs
// ==========================================
/**
 * Amlaak Video Library — Authentication & Access Control
 * Enforces server-side email allowlist and role-based permissions.
 */

var Auth = (function() {
  var ROLES = {
    OWNER: 'System Owner',
    USER_1: 'Authorised User 1',
    USER_2: 'Authorised User 2',
    EDITOR: 'Editor',
    VIEWER: 'Viewer'
  };

  /**
   * Retrieves the accessing user's email — the sole source of truth for
   * authorisation identity. Session.getEffectiveUser() is deliberately not
   * used as a fallback here: with webapp.executeAs = USER_ACCESSING, the
   * accessing identity must come only from getActiveUser(); a blank result
   * fails closed rather than substituting a different identity.
   */
  function getCurrentUserEmail() {
    var email = '';
    try {
      email = Session.getActiveUser().getEmail();
    } catch (e) {
      // ignore — fails closed to '' below
    }
    return (email || '').trim().toLowerCase();
  }

  /**
   * Diagnostic-only identity, safe to log internally (e.g. audit entries or
   * error messages). Must never be used to grant or check authorisation.
   */
  function getDiagnosticEffectiveEmail() {
    try {
      return (Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
    } catch (e) {
      return '';
    }
  }

  /**
   * Checks whether the given or current user is on the active allowlist.
   */
  function getCurrentUser() {
    var email = getCurrentUserEmail();
    if (!email) {
      return {
        email: '',
        role: null,
        active: false,
        isAuthorized: false,
        message: 'No signed-in Google account could be detected (Google session missing).'
      };
    }

    // Check allowlist in Authorised Users sheet
    var sheetUsers = getAllowlistFromSheet();
    var found = null;

    for (var i = 0; i < sheetUsers.length; i++) {
      if (sheetUsers[i].email.toLowerCase() === email) {
        found = sheetUsers[i];
        break;
      }
    }

    if (found && (String(found.active).toUpperCase() === 'YES' || found.active === true || String(found.active).toUpperCase() === 'TRUE')) {
      return {
        email: email,
        role: found.role || ROLES.EDITOR,
        active: true,
        isAuthorized: true,
        message: 'Access authorized'
      };
    }

    // If system is not initialized yet and this user is executing setup, grant bootstrap owner
    var isInit = Config.getProperty(Config.KEYS.SYSTEM_INITIALIZED);
    if (!isInit) {
      return {
        email: email,
        role: ROLES.OWNER,
        active: true,
        isAuthorized: true,
        isBootstrap: true,
        message: 'Initial setup account (Bootstrap Mode)'
      };
    }

    return {
      email: email,
      role: null,
      active: false,
      isAuthorized: false,
      message: 'This account is not on the authorized users list (Access Denied).'
    };
  }

  function requireAuth() {
    var user = getCurrentUser();
    if (!user.isAuthorized) {
      throw new Error('You are not authorized to perform this action. Email: ' + (user.email || 'unknown'));
    }
    return user;
  }

  function requireOwner() {
    var user = requireAuth();
    if (user.role !== ROLES.OWNER) {
      throw new Error('Access Denied: System Owner role required for this action.');
    }
    return user;
  }

  function getAllowlistFromSheet() {
    try {
      var ssId = Config.getProperty(Config.KEYS.SPREADSHEET_ID);
      if (!ssId) return [];
      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName(Config.TABS.USERS);
      if (!sheet) return [];

      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return [];

      var headers = data[0];
      var emailIdx = -1, activeIdx = -1, roleIdx = -1, dateIdx = -1;
      for (var c = 0; c < headers.length; c++) {
        var h = String(headers[c]).trim().toLowerCase();
        if (h === 'email') emailIdx = c;
        else if (h === 'active') activeIdx = c;
        else if (h === 'role') roleIdx = c;
        else if (h.indexOf('date') !== -1) dateIdx = c;
      }

      var list = [];
      for (var r = 1; r < data.length; r++) {
        var rowEmail = emailIdx !== -1 ? String(data[r][emailIdx]).trim() : '';
        if (rowEmail) {
          list.push({
            email: rowEmail,
            active: activeIdx !== -1 ? data[r][activeIdx] : false,
            role: roleIdx !== -1 ? data[r][roleIdx] : ROLES.EDITOR,
            addedDate: dateIdx !== -1 ? data[r][dateIdx] : ''
          });
        }
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  return {
    ROLES: ROLES,
    getCurrentUserEmail: getCurrentUserEmail,
    getDiagnosticEffectiveEmail: getDiagnosticEffectiveEmail,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    requireOwner: requireOwner,
    getAllowlistFromSheet: getAllowlistFromSheet
  };
})();


// ==========================================
// FILE: AuditService.gs
// ==========================================
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


// ==========================================
// FILE: SheetRepository.gs
// ==========================================
/**
 * Amlaak Video Library — Sheet Repository
 * Database access layer with header-based column mapping, locking, and batch updates.
 */

var SheetRepository = (function() {
  var _cachedSpreadsheet = null;

  function getSpreadsheet() {
    if (_cachedSpreadsheet) return _cachedSpreadsheet;
    var ssId = Config.getProperty(Config.KEYS.SPREADSHEET_ID);
    if (!ssId) {
      throw new Error('The spreadsheet ID has not been configured (SPREADSHEET_ID missing).');
    }
    _cachedSpreadsheet = SpreadsheetApp.openById(ssId);
    return _cachedSpreadsheet;
  }

  function getSheet(tabName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      throw new Error('The required sheet tab could not be found: ' + tabName);
    }
    return sheet;
  }

  function getHeaderMap(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return {};
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var map = {};
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i]).trim();
      if (h) {
        map[h] = i + 1; // 1-indexed column
        map[h.toLowerCase()] = i + 1;
      }
    }
    return map;
  }

  function getAllRowsAsObjects(tabName) {
    var sheet = getSheet(tabName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol === 0) return [];

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];
    var result = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var obj = { _rowNumber: r + 1 };
      var hasData = false;
      for (var c = 0; c < headers.length; c++) {
        var h = String(headers[c]).trim();
        if (h) {
          obj[h] = row[c];
          if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
            hasData = true;
          }
        }
      }
      if (hasData) {
        result.push(obj);
      }
    }
    return result;
  }

  // ==========================================
  // UNITS REPOSITORY
  // ==========================================
  function getAllUnits() {
    return getAllRowsAsObjects(Config.TABS.UNITS);
  }

  function getUnitById(unitId) {
    var units = getAllUnits();
    for (var i = 0; i < units.length; i++) {
      if (units[i]['Unit ID'] === unitId) {
        return units[i];
      }
    }
    return null;
  }

  function getNextUnitId() {
    var units = getAllUnits();
    var maxNum = 0;
    for (var i = 0; i < units.length; i++) {
      var uid = String(units[i]['Unit ID'] || '');
      var match = uid.match(/U-(\d+)/i);
      if (match && match[1]) {
        var n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return Utils.formatUnitId(maxNum + 1);
  }

  function insertUnit(unitData) {
    var sheet = getSheet(Config.TABS.UNITS);
    var headerMap = getHeaderMap(sheet);
    var lastCol = sheet.getLastColumn();
    var rowValues = new Array(lastCol);
    for (var i = 0; i < lastCol; i++) rowValues[i] = '';

    function setVal(hName, val) {
      var col = headerMap[hName] || headerMap[hName.toLowerCase()];
      if (col) rowValues[col - 1] = Utils.sanitizeForSheet(val);
    }

    setVal('Unit ID', unitData.unitId);
    setVal('Client Name', unitData.clientName);
    setVal('Location', unitData.location);
    setVal('Unit Type', unitData.unitType);
    setVal('Area (SQM)', unitData.area || '');
    setVal('Created Date', Utils.formatDateTime(new Date()));
    setVal('Created By', Auth.getCurrentUserEmail());
    setVal('Updated Date', Utils.formatDateTime(new Date()));
    setVal('Updated By', Auth.getCurrentUserEmail());

    sheet.appendRow(rowValues);
    return unitData;
  }

  function updateUnit(unitId, updatedFields) {
    var sheet = getSheet(Config.TABS.UNITS);
    var headerMap = getHeaderMap(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;

    var unitIdCol = headerMap['Unit ID'] || headerMap['unit id'];
    var idValues = sheet.getRange(2, unitIdCol, lastRow - 1, 1).getValues();

    var targetRow = -1;
    for (var r = 0; r < idValues.length; r++) {
      if (idValues[r][0] === unitId) {
        targetRow = r + 2;
        break;
      }
    }

    if (targetRow === -1) return false;

    for (var key in updatedFields) {
      var col = headerMap[key] || headerMap[key.toLowerCase()];
      if (col) {
        sheet.getRange(targetRow, col).setValue(Utils.sanitizeForSheet(updatedFields[key]));
      }
    }

    var updatedDateCol = headerMap['Updated Date'] || headerMap['updated date'];
    if (updatedDateCol) sheet.getRange(targetRow, updatedDateCol).setValue(Utils.formatDateTime(new Date()));

    var updatedByCol = headerMap['Updated By'] || headerMap['updated by'];
    if (updatedByCol) sheet.getRange(targetRow, updatedByCol).setValue(Auth.getCurrentUserEmail());

    return true;
  }

  // ==========================================
  // PROPAGATION REPOSITORY (Decision C)
  // ==========================================
  /**
   * Propagates corrected Unit fields (Client Name, Location, Unit Type, Area)
   * to all rows in Video Versions and Unit Design PDFs matching the Unit ID.
   */
  function propagateUnitFields(unitId, unitRecord) {
    var results = {
      videosUpdated: 0,
      pdfsUpdated: 0
    };

    // 1. Propagate to Video Versions
    try {
      var videoSheet = getSheet(Config.TABS.VIDEOS);
      var vHeaders = getHeaderMap(videoSheet);
      var vLastRow = videoSheet.getLastRow();
      if (vLastRow >= 2) {
        var vUnitCol = vHeaders['Unit ID'] || vHeaders['unit id'];
        var vUnitIds = videoSheet.getRange(2, vUnitCol, vLastRow - 1, 1).getValues();

        var clientCol = vHeaders['Client Name'] || vHeaders['client name'];
        var locCol = vHeaders['Location'] || vHeaders['location'];
        var typeCol = vHeaders['Unit Type'] || vHeaders['unit type'];
        var areaCol = vHeaders['Area (SQM)'] || vHeaders['area (sqm)'];
        var updDateCol = vHeaders['Updated Date'] || vHeaders['updated date'];
        var updByCol = vHeaders['Updated By'] || vHeaders['updated by'];

        for (var r = 0; r < vUnitIds.length; r++) {
          if (vUnitIds[r][0] === unitId) {
            var actualRow = r + 2;
            if (clientCol && unitRecord.clientName !== undefined) videoSheet.getRange(actualRow, clientCol).setValue(Utils.sanitizeForSheet(unitRecord.clientName));
            if (locCol && unitRecord.location !== undefined) videoSheet.getRange(actualRow, locCol).setValue(Utils.sanitizeForSheet(unitRecord.location));
            if (typeCol && unitRecord.unitType !== undefined) videoSheet.getRange(actualRow, typeCol).setValue(unitRecord.unitType);
            if (areaCol && unitRecord.area !== undefined) videoSheet.getRange(actualRow, areaCol).setValue(unitRecord.area);
            if (updDateCol) videoSheet.getRange(actualRow, updDateCol).setValue(Utils.formatDateTime(new Date()));
            if (updByCol) videoSheet.getRange(actualRow, updByCol).setValue(Auth.getCurrentUserEmail());
            results.videosUpdated++;
          }
        }
      }
    } catch (eVideos) {
      Logger.log('Propagation error on Videos: ' + eVideos.toString());
    }

    // 2. Propagate to Unit Design PDFs (if denormalized fields exist)
    try {
      var pdfSheet = getSheet(Config.TABS.PDFS);
      var pHeaders = getHeaderMap(pdfSheet);
      var pLastRow = pdfSheet.getLastRow();
      if (pLastRow >= 2) {
        var pUnitCol = pHeaders['Unit ID'] || pHeaders['unit id'];
        var pUnitIds = pdfSheet.getRange(2, pUnitCol, pLastRow - 1, 1).getValues();
        var pUpdDateCol = pHeaders['Updated Date'] || pHeaders['updated date'];
        var pUpdByCol = pHeaders['Updated By'] || pHeaders['updated by'];

        for (var pr = 0; pr < pUnitIds.length; pr++) {
          if (pUnitIds[pr][0] === unitId) {
            var pActualRow = pr + 2;
            if (pUpdDateCol) pdfSheet.getRange(pActualRow, pUpdDateCol).setValue(Utils.formatDateTime(new Date()));
            if (pUpdByCol) pdfSheet.getRange(pActualRow, pUpdByCol).setValue(Auth.getCurrentUserEmail());
            results.pdfsUpdated++;
          }
        }
      }
    } catch (ePdfs) {
      Logger.log('Propagation error on PDFs: ' + ePdfs.toString());
    }

    return results;
  }

  // ==========================================
  // VIDEO VERSIONS REPOSITORY
  // ==========================================
  function getAllVideoVersions() {
    return getAllRowsAsObjects(Config.TABS.VIDEOS);
  }

  function getVideoVersions(videoNumber) {
    var all = getAllVideoVersions();
    var filtered = [];
    var vNumStr = String(videoNumber || '').trim();
    for (var i = 0; i < all.length; i++) {
      if (String(all[i]['Video Number'] || '').trim() === vNumStr) {
        filtered.push(all[i]);
      }
    }
    return filtered;
  }

  function getVideosByUnitId(unitId) {
    var all = getAllVideoVersions();
    var filtered = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i]['Unit ID'] === unitId) {
        filtered.push(all[i]);
      }
    }
    return filtered;
  }

  function getVideoByDriveFileId(fileId) {
    var all = getAllVideoVersions();
    for (var i = 0; i < all.length; i++) {
      if (all[i]['Drive File ID'] === fileId) {
        return all[i];
      }
    }
    return null;
  }

  function getNextVideoNumber() {
    var all = getAllVideoVersions();
    var maxNum = 0;
    for (var i = 0; i < all.length; i++) {
      var vNumStr = String(all[i]['Video Number'] || '');
      var n = parseInt(vNumStr, 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
    return Utils.formatVideoNumber(maxNum + 1);
  }

  function getNextVersionNumberForVideo(videoNumber) {
    var all = getAllVideoVersions();
    var maxVer = 0;
    for (var i = 0; i < all.length; i++) {
      if (all[i]['Video Number'] === videoNumber) {
        var verStr = String(all[i]['Version Number'] || '');
        var match = verStr.match(/V?(\d+)/i);
        if (match && match[1]) {
          var v = parseInt(match[1], 10);
          if (v > maxVer) maxVer = v;
        }
      }
    }
    return maxVer + 1;
  }

  function insertVideoVersion(videoRecord) {
    var sheet = getSheet(Config.TABS.VIDEOS);
    var headerMap = getHeaderMap(sheet);
    var lastCol = sheet.getLastColumn();
    var rowValues = new Array(lastCol);
    for (var i = 0; i < lastCol; i++) rowValues[i] = '';

    function setVal(hName, val) {
      var col = headerMap[hName] || headerMap[hName.toLowerCase()];
      if (col) rowValues[col - 1] = Utils.sanitizeForSheet((val !== undefined && val !== null) ? val : '');
    }

    setVal('Video Number', videoRecord.videoNumber);
    setVal('Version Number', videoRecord.versionNumber);
    setVal('Is Current Version', videoRecord.isCurrentVersion ? 'Yes' : 'No');
    setVal('Version Notes', videoRecord.versionNotes || '');
    setVal('Video Name', videoRecord.videoName);
    setVal('Video Source', videoRecord.videoSource);
    setVal('Unit ID', videoRecord.unitId || '');
    setVal('Content Type', videoRecord.contentType || '');
    setVal('Topic', videoRecord.topic || '');
    setVal('Client Name', videoRecord.clientName || '');
    setVal('Location', videoRecord.location || '');
    setVal('Unit Type', videoRecord.unitType || '');
    setVal('Area (SQM)', videoRecord.area || '');
    setVal('Project Video Type', videoRecord.projectVideoType || '');
    setVal('Space Type', videoRecord.spaceType || '');
    // Section 8.6 Work Category (Decision A - Confirmed)
    setVal('Work Category', videoRecord.workCategory || '');
    setVal('Shooting Date', videoRecord.shootingDate || '');
    setVal('Video Link', videoRecord.videoLink || '');
    setVal('Drive File ID', videoRecord.driveFileId);
    setVal('Original File Name', videoRecord.originalFileName || '');
    // Duration & Orientation (handled gracefully if blank per Section 7.2)
    setVal('Duration', videoRecord.duration || '');
    setVal('Orientation', videoRecord.orientation || '');
    setVal('File Type', videoRecord.fileType || 'video/mp4');
    setVal('File Size', videoRecord.fileSize || '');
    setVal('Added Date', Utils.formatDateTime(new Date()));
    setVal('Added By', Auth.getCurrentUserEmail());
    setVal('Updated Date', Utils.formatDateTime(new Date()));
    setVal('Updated By', Auth.getCurrentUserEmail());

    sheet.appendRow(rowValues);
    return videoRecord;
  }

  function setPreviousVersionsToNo(videoNumber, exceptVersionNumber) {
    var sheet = getSheet(Config.TABS.VIDEOS);
    var headerMap = getHeaderMap(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    var vNumCol = headerMap['Video Number'] || headerMap['video number'];
    var verCol = headerMap['Version Number'] || headerMap['version number'];
    var currentCol = headerMap['Is Current Version'] || headerMap['is current version'];

    var vNums = sheet.getRange(2, vNumCol, lastRow - 1, 1).getValues();
    var verNums = sheet.getRange(2, verCol, lastRow - 1, 1).getValues();

    for (var r = 0; r < vNums.length; r++) {
      if (vNums[r][0] === videoNumber) {
        var vVal = verNums[r][0];
        if (vVal !== exceptVersionNumber) {
          sheet.getRange(r + 2, currentCol).setValue('No');
        }
      }
    }
  }

  function updateVideoMetadata(driveFileId, updatedFields) {
    var sheet = getSheet(Config.TABS.VIDEOS);
    var headerMap = getHeaderMap(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;

    var fileIdCol = headerMap['Drive File ID'] || headerMap['drive file id'];
    var fileIds = sheet.getRange(2, fileIdCol, lastRow - 1, 1).getValues();

    var targetRow = -1;
    for (var r = 0; r < fileIds.length; r++) {
      if (fileIds[r][0] === driveFileId) {
        targetRow = r + 2;
        break;
      }
    }

    if (targetRow === -1) return false;

    for (var key in updatedFields) {
      var col = headerMap[key] || headerMap[key.toLowerCase()];
      if (col) {
        sheet.getRange(targetRow, col).setValue(Utils.sanitizeForSheet(updatedFields[key]));
      }
    }

    var updatedDateCol = headerMap['Updated Date'] || headerMap['updated date'];
    if (updatedDateCol) sheet.getRange(targetRow, updatedDateCol).setValue(Utils.formatDateTime(new Date()));

    var updatedByCol = headerMap['Updated By'] || headerMap['updated by'];
    if (updatedByCol) sheet.getRange(targetRow, updatedByCol).setValue(Auth.getCurrentUserEmail());

    return true;
  }

  // ==========================================
  // UNIT DESIGN PDFS REPOSITORY (Decision B)
  // ==========================================
  function getAllPdfs() {
    return getAllRowsAsObjects(Config.TABS.PDFS);
  }

  function getPdfsByUnitId(unitId) {
    var all = getAllPdfs();
    var filtered = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i]['Unit ID'] === unitId) {
        filtered.push(all[i]);
      }
    }
    return filtered;
  }

  function getNextPdfVersionNumberForUnit(unitId) {
    var unitPdfs = getPdfsByUnitId(unitId);
    var maxVer = 0;
    for (var i = 0; i < unitPdfs.length; i++) {
      var verStr = String(unitPdfs[i]['PDF Version Number'] || '');
      var match = verStr.match(/V?(\d+)/i);
      if (match && match[1]) {
        var v = parseInt(match[1], 10);
        if (v > maxVer) maxVer = v;
      }
    }
    return maxVer + 1;
  }

  function insertPdf(pdfRecord) {
    var sheet = getSheet(Config.TABS.PDFS);
    var headerMap = getHeaderMap(sheet);
    var lastCol = sheet.getLastColumn();
    var rowValues = new Array(lastCol);
    for (var i = 0; i < lastCol; i++) rowValues[i] = '';

    function setVal(hName, val) {
      var col = headerMap[hName] || headerMap[hName.toLowerCase()];
      if (col) rowValues[col - 1] = Utils.sanitizeForSheet((val !== undefined && val !== null) ? val : '');
    }

    setVal('PDF Record ID', pdfRecord.pdfRecordId);
    setVal('Unit ID', pdfRecord.unitId);
    setVal('Document Title', pdfRecord.documentTitle);
    setVal('PDF Link', pdfRecord.pdfLink || '');
    setVal('Drive File ID', pdfRecord.driveFileId);
    setVal('Original File Name', pdfRecord.originalFileName || '');
    setVal('File Type', 'application/pdf');
    setVal('File Size', pdfRecord.fileSize || '');
    setVal('PDF Number', pdfRecord.pdfNumber || '');
    setVal('PDF Version Number', pdfRecord.pdfVersionNumber);
    setVal('Is Current Version', pdfRecord.isCurrentVersion ? 'Yes' : 'No');
    setVal('Version Notes', pdfRecord.versionNotes || '');
    setVal('Added Date', Utils.formatDateTime(new Date()));
    setVal('Added By', Auth.getCurrentUserEmail());
    setVal('Updated Date', Utils.formatDateTime(new Date()));
    setVal('Updated By', Auth.getCurrentUserEmail());

    sheet.appendRow(rowValues);
    return pdfRecord;
  }

  function setPreviousPdfsToNo(unitId, exceptPdfVersionNumber) {
    var sheet = getSheet(Config.TABS.PDFS);
    var headerMap = getHeaderMap(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    var unitIdCol = headerMap['Unit ID'] || headerMap['unit id'];
    var verCol = headerMap['PDF Version Number'] || headerMap['pdf version number'];
    var currentCol = headerMap['Is Current Version'] || headerMap['is current version'];

    var unitIds = sheet.getRange(2, unitIdCol, lastRow - 1, 1).getValues();
    var verNums = sheet.getRange(2, verCol, lastRow - 1, 1).getValues();

    for (var r = 0; r < unitIds.length; r++) {
      if (unitIds[r][0] === unitId) {
        var vVal = verNums[r][0];
        if (vVal !== exceptPdfVersionNumber) {
          sheet.getRange(r + 2, currentCol).setValue('No');
        }
      }
    }
  }

  // ==========================================
  // LISTS & TAXONOMIES REPOSITORY
  // ==========================================
  function getLists() {
    var taxonomies = JSON.parse(JSON.stringify(Config.TAXONOMIES));
    try {
      var sheet = getSheet(Config.TABS.LISTS);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow >= 2 && lastCol > 0) {
        var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
        var headers = data[0];
        for (var c = 0; c < headers.length; c++) {
          var h = String(headers[c]).trim();
          var colVals = [];
          for (var r = 1; r < data.length; r++) {
            var val = String(data[r][c] || '').trim();
            if (val && colVals.indexOf(val) === -1) {
              colVals.push(val);
            }
          }
          if (colVals.length > 0) {
            if (h === 'Video Source') taxonomies.videoSource = colVals;
            else if (h === 'Unit Type') taxonomies.unitType = colVals;
            else if (h === 'Project Video Type') taxonomies.projectVideoType = colVals;
            else if (h === 'Space Type') taxonomies.spaceType = colVals;
            else if (h === 'Marketing Content Type') taxonomies.marketingContentType = colVals;
            else if (h === 'Work Category') taxonomies.workCategory = colVals;
          }
        }
      }
    } catch (e) {
      // Fall back to default hardcoded taxonomies
    }

    // Dynamic distinct locations from Units and Video Versions
    taxonomies.locations = getDistinctLocations();
    return taxonomies;
  }

  function getDistinctLocations() {
    var locMap = {};
    var list = [];

    function addLoc(loc) {
      if (!loc) return;
      var clean = Utils.normalizeLocation(loc);
      if (!clean) return;
      var key = clean.toLowerCase();
      if (!locMap[key]) {
        locMap[key] = clean;
        list.push(clean);
      }
    }

    try {
      var units = getAllUnits();
      for (var i = 0; i < units.length; i++) {
        addLoc(units[i]['Location']);
      }
      var videos = getAllVideoVersions();
      for (var j = 0; j < videos.length; j++) {
        addLoc(videos[j]['Location']);
      }
    } catch (e) {
      // ignore
    }

    return list.sort();
  }

  return {
    getSpreadsheet: getSpreadsheet,
    getSheet: getSheet,
    getHeaderMap: getHeaderMap,
    getAllRowsAsObjects: getAllRowsAsObjects,
    getAllUnits: getAllUnits,
    getUnitById: getUnitById,
    getNextUnitId: getNextUnitId,
    insertUnit: insertUnit,
    updateUnit: updateUnit,
    propagateUnitFields: propagateUnitFields,
    getAllVideoVersions: getAllVideoVersions,
    getVideoVersions: getVideoVersions,
    getVideosByUnitId: getVideosByUnitId,
    getVideoByDriveFileId: getVideoByDriveFileId,
    getNextVideoNumber: getNextVideoNumber,
    getNextVersionNumberForVideo: getNextVersionNumberForVideo,
    insertVideoVersion: insertVideoVersion,
    setPreviousVersionsToNo: setPreviousVersionsToNo,
    updateVideoMetadata: updateVideoMetadata,
    getAllPdfs: getAllPdfs,
    getPdfsByUnitId: getPdfsByUnitId,
    getNextPdfVersionNumberForUnit: getNextPdfVersionNumberForUnit,
    insertPdf: insertPdf,
    setPreviousPdfsToNo: setPreviousPdfsToNo,
    getLists: getLists,
    getDistinctLocations: getDistinctLocations
  };
})();


// ==========================================
// FILE: DriveService.gs
// ==========================================
/**
 * Amlaak Video Library — Drive Service
 * Manages Google Drive file access, validation, renaming, moving, and PDF uploads.
 */

var DriveService = (function() {
  function getFolderById(folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      throw new Error('Could not access the Google Drive folder (Folder ID: ' + folderId + '). Verify the ID and permissions are correct.');
    }
  }

  function getFileById(fileId) {
    try {
      return DriveApp.getFileById(fileId);
    } catch (e) {
      throw new Error('Could not find the file in Google Drive (File ID: ' + fileId + '). Verify the link is correct.');
    }
  }

  /**
   * Verifies that the execute-as account has Editor permission on the file.
   * Required by Section 6 and Section 13 step 7.
   */
  function verifyEditorAccess(file) {
    // The operation runs as the current accessing user (webapp.executeAs =
    // USER_ACCESSING), so it is THIS account's own Drive permissions that
    // matter here — never a single fixed execution identity. Diagnostic
    // label only, not an authorisation identity.
    var executeAsEmail = Auth.getCurrentUserEmail() || Auth.getDiagnosticEffectiveEmail() || 'your Google account';
    var hasEditorAccess = false;

    try {
      // Direct check: can the file be renamed/modified?
      var currentName = file.getName();
      // Test edit capability safely by setting description or testing edit permission
      var userAccess = file.getAccess(Session.getEffectiveUser());
      if (userAccess === DriveApp.Permission.EDIT || userAccess === DriveApp.Permission.OWNER) {
        hasEditorAccess = true;
      } else {
        // Double check via sharing permission level or try/catch test
        try {
          // Attempting a benign metadata probe
          file.setDescription(file.getDescription() || '');
          hasEditorAccess = true;
        } catch (eProbe) {
          hasEditorAccess = false;
        }
      }
    } catch (e) {
      hasEditorAccess = false;
    }

    if (!hasEditorAccess) {
      var specificErrMsg = "This file isn't editable by your Google account (" + executeAsEmail + ") yet. Make sure you have Editor access to it in Google Drive and try again.";
      throw new Error(specificErrMsg);
    }

    return true;
  }

  /**
   * Validates video file existence, supported type, and permissions.
   */
  function validateAndInspectVideoFile(fileId) {
    var file = getFileById(fileId);
    verifyEditorAccess(file);

    var mimeType = file.getMimeType().toLowerCase();
    var fileName = file.getName();
    var ext = NamingService.extractExtension(fileName);

    var validVideoMimes = [
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
      'video/webm', 'video/mpeg', 'video/3gpp', 'application/mp4', 'application/octet-stream'
    ];
    var validVideoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'];

    var isVideoMime = validVideoMimes.indexOf(mimeType) !== -1;
    var isVideoExt = validVideoExts.indexOf(ext) !== -1;

    if (!isVideoMime && !isVideoExt) {
      throw new Error('The selected file is not a valid video file. Current type: ' + mimeType + ' (' + fileName + ')');
    }

    // Section 7.2: Duration & Orientation reliability
    // These fields are commonly empty. Never block save if missing.
    var durationStr = '';
    var orientationStr = '';

    try {
      if (typeof Drive !== 'undefined' && Drive.Files) {
        var meta = Drive.Files.get(fileId, { fields: 'videoMediaMetadata,size' });
        if (meta && meta.videoMediaMetadata) {
          var vMeta = meta.videoMediaMetadata;
          if (vMeta.durationMillis) {
            var totalSecs = Math.round(vMeta.durationMillis / 1000);
            var mins = Math.floor(totalSecs / 60);
            var secs = totalSecs % 60;
            durationStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
          }
          if (vMeta.width && vMeta.height) {
            var w = parseInt(vMeta.width, 10);
            var h = parseInt(vMeta.height, 10);
            if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
              orientationStr = (w >= h) ? 'Landscape' : 'Portrait';
            }
          }
        }
      }
    } catch (eMeta) {
      // Fallback gracefully — duration and orientation remain empty string
    }

    return {
      file: file,
      fileId: fileId,
      originalFileName: fileName,
      fileSize: file.getSize(),
      mimeType: mimeType,
      duration: durationStr,
      orientation: orientationStr,
      downloadUrl: file.getUrl()
    };
  }

  /**
   * Renames the original physical file on Google Drive.
   */
  function renameFile(fileId, newName) {
    var file = getFileById(fileId);
    verifyEditorAccess(file);
    var oldName = file.getName();
    var sanitized = Utils.sanitizeFilename(newName);
    if (oldName !== sanitized) {
      file.setName(sanitized);
    }
    return {
      fileId: fileId,
      oldName: oldName,
      newName: sanitized
    };
  }

  /**
   * Moves a file into the destination folder (and removes it from previous parent folders).
   */
  function moveFile(fileId, destinationFolderId) {
    var file = getFileById(fileId);
    var targetFolder = getFolderById(destinationFolderId);

    // Add to target folder
    targetFolder.addFile(file);

    // Remove from existing parent folders
    var parents = file.getParents();
    while (parents.hasNext()) {
      var parent = parents.next();
      if (parent.getId() !== destinationFolderId) {
        parent.removeFile(file);
      }
    }

    return {
      fileId: fileId,
      folderId: destinationFolderId
    };
  }

  /**
   * Uploads base64 PDF data to the Unit Design PDFs folder.
   */
  function uploadDesignPdf(unitId, fileName, base64Content) {
    var folderId = Config.getProperty(Config.KEYS.UNIT_DESIGN_PDFS_FOLDER_ID);
    if (!folderId) {
      throw new Error('The PDF files folder has not been configured (UNIT_DESIGN_PDFS_FOLDER_ID missing).');
    }
    var folder = getFolderById(folderId);

    var cleanName = Utils.sanitizeFilename(fileName || 'Design.pdf');
    if (!cleanName.toLowerCase().endsWith('.pdf')) {
      cleanName += '.pdf';
    }

    // Decode base64
    var decoded = Utilities.base64Decode(base64Content);
    var blob = Utilities.newBlob(decoded, 'application/pdf', cleanName);
    var newFile = folder.createFile(blob);

    return {
      fileId: newFile.getId(),
      fileName: newFile.getName(),
      fileSize: newFile.getSize(),
      url: newFile.getUrl()
    };
  }

  /**
   * Batch renames a list of files with granular progress and error tolerance.
   * Used for Section 2.3 Decision C propagation.
   */
  function batchRenameFiles(renameTasks) {
    var results = {
      successful: [],
      failed: []
    };

    for (var i = 0; i < renameTasks.length; i++) {
      var task = renameTasks[i];
      try {
        var renamed = renameFile(task.fileId, task.proposedName);
        results.successful.push({
          fileId: task.fileId,
          oldName: renamed.oldName,
          newName: renamed.newName,
          entityId: task.entityId || task.fileId
        });
      } catch (e) {
        results.failed.push({
          fileId: task.fileId,
          oldName: task.currentName,
          proposedName: task.proposedName,
          error: e.message || e.toString()
        });
      }
    }

    return results;
  }

  return {
    getFolderById: getFolderById,
    getFileById: getFileById,
    verifyEditorAccess: verifyEditorAccess,
    validateAndInspectVideoFile: validateAndInspectVideoFile,
    renameFile: renameFile,
    moveFile: moveFile,
    uploadDesignPdf: uploadDesignPdf,
    batchRenameFiles: batchRenameFiles
  };
})();


// ==========================================
// FILE: UnitService.gs
// ==========================================
/**
 * Amlaak Video Library — Unit Service
 * Manages unit lifecycles, Decision C denormalized propagation, and batch rename preview/execution.
 */

var UnitService = (function() {
  function getUnits() {
    Auth.requireAuth();
    var units = SheetRepository.getAllUnits();
    var allVideos = SheetRepository.getAllVideoVersions();
    var allPdfs = SheetRepository.getAllPdfs();

    // Map counts
    var videoCountMap = {};
    for (var i = 0; i < allVideos.length; i++) {
      var uid = allVideos[i]['Unit ID'];
      if (uid) {
        if (!videoCountMap[uid]) videoCountMap[uid] = {};
        var vNum = allVideos[i]['Video Number'];
        videoCountMap[uid][vNum] = true;
      }
    }

    var pdfCountMap = {};
    for (var j = 0; j < allPdfs.length; j++) {
      var pUid = allPdfs[j]['Unit ID'];
      if (pUid) {
        pdfCountMap[pUid] = (pdfCountMap[pUid] || 0) + 1;
      }
    }

    var list = [];
    for (var u = 0; u < units.length; u++) {
      var item = units[u];
      var uId = item['Unit ID'];
      var logicalCount = videoCountMap[uId] ? Object.keys(videoCountMap[uId]).length : 0;
      var pdfCount = pdfCountMap[uId] || 0;

      list.push({
        unitId: uId,
        clientName: item['Client Name'],
        location: item['Location'],
        unitType: item['Unit Type'],
        area: item['Area (SQM)'],
        createdDate: item['Created Date'],
        createdBy: item['Created By'],
        updatedDate: item['Updated Date'],
        updatedBy: item['Updated By'],
        videoCount: logicalCount,
        pdfCount: pdfCount
      });
    }

    return list;
  }

  function getUnitDetail(unitId) {
    Auth.requireAuth();
    var unit = SheetRepository.getUnitById(unitId);
    if (!unit) {
      throw new Error('The requested unit does not exist: ' + unitId);
    }

    var allVideos = SheetRepository.getVideosByUnitId(unitId);
    var allPdfs = SheetRepository.getPdfsByUnitId(unitId);

    // Group videos by Video Number
    var logicalVideosMap = {};
    for (var i = 0; i < allVideos.length; i++) {
      var v = allVideos[i];
      var vNum = v['Video Number'];
      if (!logicalVideosMap[vNum]) {
        logicalVideosMap[vNum] = {
          videoNumber: vNum,
          videoSource: v['Video Source'],
          projectVideoType: v['Project Video Type'],
          spaceType: v['Space Type'],
          workCategory: v['Work Category'],
          shootingDate: v['Shooting Date'],
          currentVersion: null,
          versions: []
        };
      }
      var isCurrent = String(v['Is Current Version']).toLowerCase() === 'yes';
      var verObj = {
        versionNumber: v['Version Number'],
        isCurrentVersion: isCurrent,
        versionNotes: v['Version Notes'],
        videoName: v['Video Name'],
        driveFileId: v['Drive File ID'],
        videoLink: v['Video Link'],
        originalFileName: v['Original File Name'],
        duration: v['Duration'],
        orientation: v['Orientation'],
        addedDate: v['Added Date'],
        addedBy: v['Added By']
      };
      logicalVideosMap[vNum].versions.push(verObj);
      if (isCurrent) {
        logicalVideosMap[vNum].currentVersion = verObj;
      }
    }

    // Format PDFs with version info (Decision B)
    var pdfList = [];
    for (var j = 0; j < allPdfs.length; j++) {
      var p = allPdfs[j];
      pdfList.push({
        pdfRecordId: p['PDF Record ID'],
        unitId: p['Unit ID'],
        documentTitle: p['Document Title'],
        pdfLink: p['PDF Link'],
        driveFileId: p['Drive File ID'],
        originalFileName: p['Original File Name'],
        pdfNumber: p['PDF Number'],
        pdfVersionNumber: p['PDF Version Number'],
        isCurrentVersion: String(p['Is Current Version']).toLowerCase() === 'yes',
        versionNotes: p['Version Notes'],
        fileSize: p['File Size'],
        addedDate: p['Added Date'],
        addedBy: p['Added By']
      });
    }

    return {
      unit: {
        unitId: unit['Unit ID'],
        clientName: unit['Client Name'],
        location: unit['Location'],
        unitType: unit['Unit Type'],
        area: unit['Area (SQM)'],
        createdDate: unit['Created Date'],
        createdBy: unit['Created By']
      },
      videos: Object.values(logicalVideosMap),
      pdfs: pdfList
    };
  }

  function createUnit(payload) {
    Auth.requireAuth();
    var validation = Validators.validateUnit(payload);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(function(e) { return e.message; }).join(' | '));
    }

    return Utils.withLock(15000, function() {
      var unitId = SheetRepository.getNextUnitId();
      var unitRecord = {
        unitId: unitId,
        clientName: payload.clientName.trim(),
        location: Utils.normalizeLocation(payload.location),
        unitType: payload.unitType.trim(),
        area: payload.area ? Number(payload.area) : ''
      };

      SheetRepository.insertUnit(unitRecord);
      AuditService.logSuccess('CREATE_UNIT', 'Unit', unitId, '', 'Created unit ' + unitId + ' for client ' + unitRecord.clientName);

      return unitRecord;
    });
  }

  /**
   * Preview or execute unit update with Decision C propagation.
   * If optExecuteBatchRename is false/omitted, generates the list of affected files with current and proposed names.
   * If optExecuteBatchRename is true, renames all affected files and logs to Audit Log.
   */
  function updateUnit(unitId, updatedFields, optExecuteBatchRename) {
    Auth.requireAuth();
    var existingUnit = SheetRepository.getUnitById(unitId);
    if (!existingUnit) {
      throw new Error('The unit to be updated does not exist: ' + unitId);
    }

    var cleanFields = {};
    if (updatedFields.clientName !== undefined) cleanFields.clientName = updatedFields.clientName.trim();
    if (updatedFields.location !== undefined) cleanFields.location = Utils.normalizeLocation(updatedFields.location);
    if (updatedFields.unitType !== undefined) cleanFields.unitType = updatedFields.unitType.trim();
    if (updatedFields.area !== undefined) cleanFields.area = updatedFields.area ? Number(updatedFields.area) : '';

    var validation = Validators.validateUnit({
      clientName: cleanFields.clientName !== undefined ? cleanFields.clientName : existingUnit['Client Name'],
      location: cleanFields.location !== undefined ? cleanFields.location : existingUnit['Location'],
      unitType: cleanFields.unitType !== undefined ? cleanFields.unitType : existingUnit['Unit Type'],
      area: cleanFields.area !== undefined ? cleanFields.area : existingUnit['Area (SQM)']
    });

    if (!validation.isValid) {
      throw new Error(validation.errors.map(function(e) { return e.message; }).join(' | '));
    }

    return Utils.withLock(25000, function() {
      // 1. Update Unit record
      SheetRepository.updateUnit(unitId, {
        'Client Name': cleanFields.clientName !== undefined ? cleanFields.clientName : existingUnit['Client Name'],
        'Location': cleanFields.location !== undefined ? cleanFields.location : existingUnit['Location'],
        'Unit Type': cleanFields.unitType !== undefined ? cleanFields.unitType : existingUnit['Unit Type'],
        'Area (SQM)': cleanFields.area !== undefined ? cleanFields.area : existingUnit['Area (SQM)']
      });

      // 2. Propagate to Video Versions and PDFs metadata rows (Decision C)
      SheetRepository.propagateUnitFields(unitId, cleanFields);

      // 3. Detect filename changes for all videos and PDFs connected to this unit
      var affectedVideos = SheetRepository.getVideosByUnitId(unitId);
      var affectedPdfs = SheetRepository.getPdfsByUnitId(unitId);

      var proposedRenames = [];

      // Check videos
      for (var v = 0; v < affectedVideos.length; v++) {
        var vid = affectedVideos[v];
        var currentFileName = vid['Video Name'];
        var ext = NamingService.extractExtension(vid['Original File Name'] || currentFileName);

        var proposedName = NamingService.generateProjectVideoName({
          clientName: cleanFields.clientName !== undefined ? cleanFields.clientName : vid['Client Name'],
          location: cleanFields.location !== undefined ? cleanFields.location : vid['Location'],
          projectVideoType: vid['Project Video Type'],
          spaceType: vid['Space Type'],
          shootingDate: vid['Shooting Date'],
          versionNumber: vid['Version Number'],
          originalFileName: currentFileName,
          extension: ext
        });

        if (proposedName !== currentFileName) {
          proposedRenames.push({
            entityType: 'Video',
            entityId: vid['Video Number'] + '-' + vid['Version Number'],
            fileId: vid['Drive File ID'],
            currentName: currentFileName,
            proposedName: proposedName
          });
        }
      }

      // Check PDFs
      for (var p = 0; p < affectedPdfs.length; p++) {
        var pdf = affectedPdfs[p];
        var currentPdfName = pdf['Document Title'];
        var proposedPdfName = NamingService.generateUnitPdfName({
          clientName: cleanFields.clientName !== undefined ? cleanFields.clientName : existingUnit['Client Name'],
          location: cleanFields.location !== undefined ? cleanFields.location : existingUnit['Location'],
          documentTitle: currentPdfName,
          versionNumber: pdf['PDF Version Number']
        });

        if (proposedPdfName !== currentPdfName) {
          proposedRenames.push({
            entityType: 'PDF',
            entityId: pdf['PDF Record ID'],
            fileId: pdf['Drive File ID'],
            currentName: currentPdfName,
            proposedName: proposedPdfName
          });
        }
      }

      // If user did not explicitly trigger the batch rename execution yet, return preview
      if (!optExecuteBatchRename) {
        return {
          unitId: unitId,
          metadataUpdated: true,
          requiresBatchRename: proposedRenames.length > 0,
          proposedRenames: proposedRenames,
          message: 'Unit data and its related versions were updated successfully in the database.'
        };
      }

      // If user confirmed batch rename: execute Drive renames and update sheet filenames
      var batchResult = DriveService.batchRenameFiles(proposedRenames);

      // Update Video Name in Sheet for successfully renamed videos
      for (var s = 0; s < batchResult.successful.length; s++) {
        var sItem = batchResult.successful[s];
        SheetRepository.updateVideoMetadata(sItem.fileId, {
          'Video Name': sItem.newName
        });
        AuditService.logSuccess('BATCH_RENAME_FILE', 'DriveFile', sItem.fileId, sItem.fileId,
          'Renamed from [' + sItem.oldName + '] to [' + sItem.newName + ']');
      }

      // Log any failures
      for (var f = 0; f < batchResult.failed.length; f++) {
        var fItem = batchResult.failed[f];
        AuditService.logFailure('BATCH_RENAME_FILE', 'DriveFile', fItem.fileId, fItem.fileId, 'RENAME_FAILED',
          'Failed to rename file ' + fItem.currentName + ': ' + fItem.error);
      }

      return {
        unitId: unitId,
        metadataUpdated: true,
        batchRenameExecuted: true,
        renamedCount: batchResult.successful.length,
        failedCount: batchResult.failed.length,
        details: batchResult,
        message: 'Data updated and ' + batchResult.successful.length + ' file(s) renamed successfully.'
      };
    });
  }

  return {
    getUnits: getUnits,
    getUnitDetail: getUnitDetail,
    createUnit: createUnit,
    updateUnit: updateUnit
  };
})();


// ==========================================
// FILE: VideoService.gs
// ==========================================
/**
 * Amlaak Video Library — Video Service
 * Implements full 22-step video registration, versioning, search/filter, and metadata updates.
 */

var VideoService = (function() {
  /**
   * Registers a new Project Video.
   */
  function addProjectVideo(payload) {
    Auth.requireAuth();

    // 1. Validate payload
    var validation = Validators.validateProjectVideo(payload);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(function(e) { return e.message; }).join(' | '));
    }

    // 2. Extract Drive File ID
    var fileId = Validators.extractDriveFileId(payload.videoLink);
    if (!fileId) {
      throw new Error('Could not extract a File ID from the link.');
    }

    // 3. Duplicate check
    var existingRecord = SheetRepository.getVideoByDriveFileId(fileId);
    if (existingRecord) {
      throw new Error('This file is already registered in the system under Video Number: ' + existingRecord['Video Number'] + ' (' + existingRecord['Version Number'] + ')');
    }

    // 4. Inspect Drive file and verify Editor access
    var fileInspection = DriveService.validateAndInspectVideoFile(fileId);

    // 5. Ensure destination folder
    var destFolderId = Config.getProperty(Config.KEYS.PROJECT_VIDEOS_FOLDER_ID);
    if (!destFolderId) {
      throw new Error('The project videos folder has not been configured (PROJECT_VIDEOS_FOLDER_ID missing).');
    }

    return Utils.withLock(30000, function() {
      // 6. Handle or ensure Unit ID
      var unitId = payload.unitId;
      if (!unitId) {
        // Create unit automatically if new
        var newUnit = SheetRepository.insertUnit({
          unitId: SheetRepository.getNextUnitId(),
          clientName: payload.clientName.trim(),
          location: Utils.normalizeLocation(payload.location),
          unitType: payload.unitType.trim(),
          area: payload.area ? Number(payload.area) : ''
        });
        unitId = newUnit.unitId;
      }

      // 7. Generate next Video Number & Version Number (V01)
      var videoNumber = SheetRepository.getNextVideoNumber();
      var versionNumber = 'V01';

      // 8. Generate organized filename
      var organizedName = NamingService.generateProjectVideoName({
        clientName: payload.clientName,
        location: payload.location,
        projectVideoType: payload.projectVideoType,
        spaceType: payload.spaceType,
        shootingDate: payload.shootingDate,
        versionNumber: 1,
        originalFileName: fileInspection.originalFileName
      });

      // 9. Rename original file on Drive
      DriveService.renameFile(fileId, organizedName);

      // 10. Move original file to destination folder
      DriveService.moveFile(fileId, destFolderId);

      // 11. Add row to Sheet
      var record = {
        videoNumber: videoNumber,
        versionNumber: versionNumber,
        isCurrentVersion: true,
        versionNotes: payload.versionNotes || 'Initial first version',
        videoName: organizedName,
        videoSource: 'Project Video',
        unitId: unitId,
        contentType: '',
        topic: '',
        clientName: payload.clientName.trim(),
        location: Utils.normalizeLocation(payload.location),
        unitType: payload.unitType.trim(),
        area: payload.area ? Number(payload.area) : '',
        projectVideoType: payload.projectVideoType.trim(),
        spaceType: payload.spaceType.trim(),
        workCategory: payload.workCategory.trim(), // Decision A
        shootingDate: Utils.normalizeDateString(payload.shootingDate),
        videoLink: payload.videoLink,
        driveFileId: fileId,
        originalFileName: fileInspection.originalFileName,
        duration: fileInspection.duration || '',
        orientation: fileInspection.orientation || '',
        fileType: fileInspection.mimeType,
        fileSize: fileInspection.fileSize
      };

      SheetRepository.insertVideoVersion(record);

      // 12. Optional PDF Upload if provided simultaneously
      var attachedPdf = null;
      if (payload.pdfFileBase64 && payload.pdfFileName) {
        attachedPdf = PdfService.uploadUnitDesignPdf({
          unitId: unitId,
          documentTitle: payload.pdfDocumentTitle || 'Architectural Design - ' + payload.clientName,
          fileName: payload.pdfFileName,
          base64Content: payload.pdfFileBase64,
          versionNotes: 'Attached with video number ' + videoNumber
        });
      }

      // 13. Audit Log
      AuditService.logSuccess('ADD_PROJECT_VIDEO', 'Video', videoNumber + '-' + versionNumber, fileId,
        'Successfully registered a new project video: ' + organizedName);

      return {
        video: record,
        attachedPdf: attachedPdf
      };
    });
  }

  /**
   * Registers new Marketing Content.
   */
  function addMarketingContent(payload) {
    Auth.requireAuth();

    // 1. Validate payload
    var validation = Validators.validateMarketingContent(payload);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(function(e) { return e.message; }).join(' | '));
    }

    // 2. Extract Drive File ID
    var fileId = Validators.extractDriveFileId(payload.videoLink);
    if (!fileId) {
      throw new Error('Could not extract a File ID from the link.');
    }

    // 3. Duplicate check
    var existingRecord = SheetRepository.getVideoByDriveFileId(fileId);
    if (existingRecord) {
      throw new Error('This file is already registered in the system under Video Number: ' + existingRecord['Video Number']);
    }

    // 4. Inspect Drive file and verify Editor access
    var fileInspection = DriveService.validateAndInspectVideoFile(fileId);

    // 5. Destination folder
    var destFolderId = Config.getProperty(Config.KEYS.MARKETING_CONTENT_FOLDER_ID);
    if (!destFolderId) {
      throw new Error('The marketing content folder has not been configured (MARKETING_CONTENT_FOLDER_ID missing).');
    }

    return Utils.withLock(30000, function() {
      var videoNumber = SheetRepository.getNextVideoNumber();
      var versionNumber = 'V01';

      var organizedName = NamingService.generateMarketingContentName({
        contentType: payload.contentType,
        topic: payload.topic,
        spaceType: payload.contentType === 'Educational' ? '' : (payload.spaceType || ''),
        shootingDate: payload.shootingDate,
        versionNumber: 1,
        originalFileName: fileInspection.originalFileName
      });

      DriveService.renameFile(fileId, organizedName);
      DriveService.moveFile(fileId, destFolderId);

      var record = {
        videoNumber: videoNumber,
        versionNumber: versionNumber,
        isCurrentVersion: true,
        versionNotes: payload.versionNotes || 'Initial first version',
        videoName: organizedName,
        videoSource: 'Marketing Content',
        unitId: '',
        contentType: payload.contentType.trim(),
        topic: payload.topic.trim(),
        clientName: '',
        location: '',
        unitType: '',
        area: '',
        projectVideoType: '',
        spaceType: payload.contentType === 'Educational' ? '' : (payload.spaceType || '').trim(),
        workCategory: '',
        shootingDate: Utils.normalizeDateString(payload.shootingDate),
        videoLink: payload.videoLink,
        driveFileId: fileId,
        originalFileName: fileInspection.originalFileName,
        duration: fileInspection.duration || '',
        orientation: fileInspection.orientation || '',
        fileType: fileInspection.mimeType,
        fileSize: fileInspection.fileSize
      };

      SheetRepository.insertVideoVersion(record);
      AuditService.logSuccess('ADD_MARKETING_CONTENT', 'Video', videoNumber + '-' + versionNumber, fileId,
        'Registered new marketing content: ' + organizedName);

      return {
        video: record
      };
    });
  }

  /**
   * Adds a new version to an existing logical video (Section 14).
   */
  function addNewVersion(payload) {
    Auth.requireAuth();

    var videoNumber = String(payload.videoNumber).trim();
    if (!videoNumber) {
      throw new Error('Video Number is required to add a new version.');
    }

    var fileId = Validators.extractDriveFileId(payload.videoLink);
    if (!fileId) {
      throw new Error('Invalid Google Drive link, or no File ID could be found.');
    }

    // Duplicate check
    var existingRecord = SheetRepository.getVideoByDriveFileId(fileId);
    if (existingRecord) {
      throw new Error('This file is already used as another version in the system (Drive File ID duplicate).');
    }

    var fileInspection = DriveService.validateAndInspectVideoFile(fileId);

    return Utils.withLock(30000, function() {
      // Find existing versions of this video to copy metadata
      var allVersions = SheetRepository.getAllVideoVersions();
      var matching = [];
      for (var i = 0; i < allVersions.length; i++) {
        if (allVersions[i]['Video Number'] === videoNumber) {
          matching.push(allVersions[i]);
        }
      }

      if (matching.length === 0) {
        throw new Error('The original video does not exist: ' + videoNumber);
      }

      // Base metadata on current or latest version
      var baseRecord = matching[0];
      for (var m = 0; m < matching.length; m++) {
        if (String(matching[m]['Is Current Version']).toLowerCase() === 'yes') {
          baseRecord = matching[m];
          break;
        }
      }

      var nextVerInt = SheetRepository.getNextVersionNumberForVideo(videoNumber);
      var versionStr = Utils.formatVersionNumber(nextVerInt);

      // Determine destination folder
      var isProject = baseRecord['Video Source'] === 'Project Video';
      var destFolderId = isProject
        ? Config.getProperty(Config.KEYS.PROJECT_VIDEOS_FOLDER_ID)
        : Config.getProperty(Config.KEYS.MARKETING_CONTENT_FOLDER_ID);

      // Generate organized name with new version number
      var organizedName = isProject
        ? NamingService.generateProjectVideoName({
            clientName: payload.clientName !== undefined ? payload.clientName : baseRecord['Client Name'],
            location: payload.location !== undefined ? payload.location : baseRecord['Location'],
            projectVideoType: payload.projectVideoType !== undefined ? payload.projectVideoType : baseRecord['Project Video Type'],
            spaceType: payload.spaceType !== undefined ? payload.spaceType : baseRecord['Space Type'],
            shootingDate: payload.shootingDate !== undefined ? payload.shootingDate : baseRecord['Shooting Date'],
            versionNumber: nextVerInt,
            originalFileName: fileInspection.originalFileName
          })
        : NamingService.generateMarketingContentName({
            contentType: payload.contentType !== undefined ? payload.contentType : baseRecord['Content Type'],
            topic: payload.topic !== undefined ? payload.topic : baseRecord['Topic'],
            spaceType: payload.spaceType !== undefined ? payload.spaceType : baseRecord['Space Type'],
            shootingDate: payload.shootingDate !== undefined ? payload.shootingDate : baseRecord['Shooting Date'],
            versionNumber: nextVerInt,
            originalFileName: fileInspection.originalFileName
          });

      // Rename & Move physical Drive file
      DriveService.renameFile(fileId, organizedName);
      DriveService.moveFile(fileId, destFolderId);

      // Flip previous versions to 'No'
      SheetRepository.setPreviousVersionsToNo(videoNumber, versionStr);

      // Insert new version
      var newVersionRecord = {
        videoNumber: videoNumber,
        versionNumber: versionStr,
        isCurrentVersion: true,
        versionNotes: payload.versionNotes || 'New edit',
        videoName: organizedName,
        videoSource: baseRecord['Video Source'],
        unitId: baseRecord['Unit ID'] || '',
        contentType: payload.contentType || baseRecord['Content Type'] || '',
        topic: payload.topic || baseRecord['Topic'] || '',
        clientName: payload.clientName || baseRecord['Client Name'] || '',
        location: payload.location || baseRecord['Location'] || '',
        unitType: payload.unitType || baseRecord['Unit Type'] || '',
        area: payload.area !== undefined ? payload.area : (baseRecord['Area (SQM)'] || ''),
        projectVideoType: payload.projectVideoType || baseRecord['Project Video Type'] || '',
        spaceType: payload.spaceType || baseRecord['Space Type'] || '',
        workCategory: payload.workCategory || baseRecord['Work Category'] || '',
        shootingDate: Utils.normalizeDateString(payload.shootingDate || baseRecord['Shooting Date']),
        videoLink: payload.videoLink,
        driveFileId: fileId,
        originalFileName: fileInspection.originalFileName,
        duration: fileInspection.duration || '',
        orientation: fileInspection.orientation || '',
        fileType: fileInspection.mimeType,
        fileSize: fileInspection.fileSize
      };

      SheetRepository.insertVideoVersion(newVersionRecord);
      AuditService.logSuccess('ADD_VIDEO_VERSION', 'Video', videoNumber + '-' + versionStr, fileId,
        'Added new version (' + versionStr + ') for video ' + videoNumber + ': ' + organizedName);

      return newVersionRecord;
    });
  }

  /**
   * Searches and filters video versions for Library view.
   */
  function getLibraryVideos(filters) {
    Auth.requireAuth();
    var allRows = SheetRepository.getAllVideoVersions();
    var includePrevious = filters && filters.includePreviousVersions === true;
    var filtered = [];

    for (var i = 0; i < allRows.length; i++) {
      var row = allRows[i];
      var isCurrent = String(row['Is Current Version']).toLowerCase() === 'yes';

      // Default: current versions only unless explicitly requested
      if (!includePrevious && !isCurrent) {
        continue;
      }

      // Filter: Video Source
      if (filters && filters.videoSource && row['Video Source'] !== filters.videoSource) {
        continue;
      }

      // Filter: Content Type
      if (filters && filters.contentType && row['Content Type'] !== filters.contentType) {
        continue;
      }

      // Filter: Project Video Type
      if (filters && filters.projectVideoType && row['Project Video Type'] !== filters.projectVideoType) {
        continue;
      }

      // Filter: Space Type
      if (filters && filters.spaceType && row['Space Type'] !== filters.spaceType) {
        continue;
      }

      // Filter: Work Category (Decision A)
      if (filters && filters.workCategory && row['Work Category'] !== filters.workCategory) {
        continue;
      }

      // Filter: Client Name explicit
      if (filters && filters.clientName && String(filters.clientName).trim()) {
        var rowCName = (row['Client Name'] || '').toLowerCase();
        if (rowCName.indexOf(filters.clientName.toLowerCase().trim()) === -1) continue;
      }

      // Filter: Location
      if (filters && filters.location) {
        var rowLoc = (row['Location'] || '').toLowerCase();
        var targetLoc = filters.location.toLowerCase();
        if (rowLoc.indexOf(targetLoc) === -1) continue;
      }

      // Filter: Unit Type
      if (filters && filters.unitType && row['Unit Type'] !== filters.unitType) {
        continue;
      }

      // Filter: Area Range
      if (filters && (filters.areaMin !== undefined && filters.areaMin !== '')) {
        var aMin = Number(filters.areaMin);
        if (!isNaN(aMin) && Number(row['Area (SQM)']) < aMin) continue;
      }
      if (filters && (filters.areaMax !== undefined && filters.areaMax !== '')) {
        var aMax = Number(filters.areaMax);
        if (!isNaN(aMax) && Number(row['Area (SQM)']) > aMax) continue;
      }

      // Filter: Client Name, Topic, Video Name, Video Number or Unit ID search query
      if (filters && filters.searchQuery) {
        var query = filters.searchQuery.toLowerCase().trim();
        var clientName = (row['Client Name'] || '').toLowerCase();
        var topic = (row['Topic'] || '').toLowerCase();
        var vName = (row['Video Name'] || '').toLowerCase();
        var vNum = (row['Video Number'] || '').toLowerCase();
        var uId = (row['Unit ID'] || '').toLowerCase();

        if (clientName.indexOf(query) === -1 &&
            topic.indexOf(query) === -1 &&
            vName.indexOf(query) === -1 &&
            vNum.indexOf(query) === -1 &&
            uId.indexOf(query) === -1) {
          continue;
        }
      }

      // Date Filtering: Shooting Date vs Added Date
      if (filters && (filters.startDate || filters.endDate)) {
        var dateField = (filters.dateFilterType === 'Added Date') ? 'Added Date' : 'Shooting Date';
        var rowDateVal = row[dateField];
        if (rowDateVal) {
          var dateNormalized = Utils.normalizeDateString(rowDateVal);
          if (filters.startDate && dateNormalized < filters.startDate) continue;
          if (filters.endDate && dateNormalized > filters.endDate) continue;
        }
      }

      filtered.push({
        videoNumber: row['Video Number'],
        versionNumber: row['Version Number'],
        isCurrentVersion: isCurrent,
        versionNotes: row['Version Notes'] || '',
        videoName: row['Video Name'],
        videoSource: row['Video Source'],
        unitId: row['Unit ID'] || '',
        contentType: row['Content Type'] || '',
        topic: row['Topic'] || '',
        clientName: row['Client Name'] || '',
        location: row['Location'] || '',
        unitType: row['Unit Type'] || '',
        area: row['Area (SQM)'] || '',
        projectVideoType: row['Project Video Type'] || '',
        spaceType: row['Space Type'] || '',
        workCategory: row['Work Category'] || '',
        shootingDate: row['Shooting Date'] || '',
        videoLink: row['Video Link'] || '',
        driveFileId: row['Drive File ID'],
        originalFileName: row['Original File Name'] || '',
        duration: row['Duration'] || '',
        orientation: row['Orientation'] || '',
        fileSize: row['File Size'] || '',
        addedDate: row['Added Date'] || '',
        addedBy: row['Added By'] || ''
      });
    }

    // Controlled server-side pagination
    var totalCount = filtered.length;
    var page = (filters && filters.page) ? parseInt(filters.page, 10) : 1;
    if (isNaN(page) || page < 1) page = 1;
    var pageSize = (filters && filters.pageSize) ? parseInt(filters.pageSize, 10) : 25;
    if (isNaN(pageSize) || pageSize < 1) pageSize = 25;

    var totalPages = Math.ceil(totalCount / pageSize) || 1;
    var startIndex = (page - 1) * pageSize;
    var pageItems = filtered.slice(startIndex, startIndex + pageSize);
    var hasMore = (startIndex + pageSize) < totalCount;

    return {
      items: pageItems,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: totalPages,
      hasMore: hasMore
    };
  }

  /**
   * Updates metadata for a single video version (Section 16).
   * If filename changes, checks for confirmation before Drive rename.
   */
  function updateSingleVideoMetadata(driveFileId, updatedFields, optConfirmRename) {
    Auth.requireAuth();

    var existing = SheetRepository.getVideoByDriveFileId(driveFileId);
    if (!existing) {
      throw new Error('The video file does not exist: ' + driveFileId);
    }

    return Utils.withLock(20000, function() {
      var isProject = existing['Video Source'] === 'Project Video';

      var proposedName = isProject
        ? NamingService.generateProjectVideoName({
            clientName: updatedFields.clientName !== undefined ? updatedFields.clientName : existing['Client Name'],
            location: updatedFields.location !== undefined ? updatedFields.location : existing['Location'],
            projectVideoType: updatedFields.projectVideoType !== undefined ? updatedFields.projectVideoType : existing['Project Video Type'],
            spaceType: updatedFields.spaceType !== undefined ? updatedFields.spaceType : existing['Space Type'],
            shootingDate: updatedFields.shootingDate !== undefined ? updatedFields.shootingDate : existing['Shooting Date'],
            versionNumber: existing['Version Number'],
            originalFileName: existing['Original File Name']
          })
        : NamingService.generateMarketingContentName({
            contentType: updatedFields.contentType !== undefined ? updatedFields.contentType : existing['Content Type'],
            topic: updatedFields.topic !== undefined ? updatedFields.topic : existing['Topic'],
            spaceType: updatedFields.spaceType !== undefined ? updatedFields.spaceType : existing['Space Type'],
            shootingDate: updatedFields.shootingDate !== undefined ? updatedFields.shootingDate : existing['Shooting Date'],
            versionNumber: existing['Version Number'],
            originalFileName: existing['Original File Name']
          });

      var currentName = existing['Video Name'];
      var nameChanged = (proposedName !== currentName);

      if (nameChanged && !optConfirmRename) {
        return {
          requiresRenameConfirmation: true,
          currentName: currentName,
          proposedName: proposedName,
          message: 'This edit changes the approved file name. Please confirm renaming the file on Google Drive.'
        };
      }

      var sheetUpdates = {};
      for (var k in updatedFields) {
        sheetUpdates[k] = updatedFields[k];
      }

      if (nameChanged && optConfirmRename) {
        DriveService.renameFile(driveFileId, proposedName);
        sheetUpdates['Video Name'] = proposedName;
        AuditService.logSuccess('RENAME_SINGLE_VIDEO', 'Video', existing['Video Number'], driveFileId,
          'Renamed from ' + currentName + ' to ' + proposedName);
      }

      SheetRepository.updateVideoMetadata(driveFileId, sheetUpdates);
      AuditService.logSuccess('UPDATE_VIDEO_METADATA', 'Video', existing['Video Number'], driveFileId,
        'Updated video metadata.');

      return {
        success: true,
        newName: proposedName,
        message: 'Video data updated successfully.'
      };
    });
  }

  /**
   * Retrieves the full version history for a logical video.
   */
  function getVideoVersionHistory(videoNumber) {
    Auth.requireAuth();

    if (!videoNumber || !String(videoNumber).trim()) {
      throw new Error('Video Number is required.');
    }

    var cleanNum = Utils.formatVideoNumber(videoNumber);
    var allRows = SheetRepository.getAllVideoVersions();
    var matching = [];

    for (var i = 0; i < allRows.length; i++) {
      var row = allRows[i];
      var rowVNum = String(row['Video Number'] || '').trim();
      if (rowVNum === cleanNum || rowVNum === String(videoNumber).trim()) {
        var isCur = String(row['Is Current Version']).toLowerCase() === 'yes' || row['Is Current Version'] === true;
        matching.push({
          videoNumber: row['Video Number'],
          versionNumber: row['Version Number'],
          isCurrentVersion: isCur,
          versionNotes: row['Version Notes'] || '',
          videoName: row['Video Name'],
          videoSource: row['Video Source'],
          unitId: row['Unit ID'] || '',
          contentType: row['Content Type'] || '',
          topic: row['Topic'] || '',
          clientName: row['Client Name'] || '',
          location: row['Location'] || '',
          unitType: row['Unit Type'] || '',
          area: row['Area (SQM)'] || '',
          projectVideoType: row['Project Video Type'] || '',
          spaceType: row['Space Type'] || '',
          workCategory: row['Work Category'] || '',
          shootingDate: row['Shooting Date'] || '',
          videoLink: row['Video Link'] || '',
          driveFileId: row['Drive File ID'],
          originalFileName: row['Original File Name'] || '',
          duration: row['Duration'] || '',
          orientation: row['Orientation'] || '',
          fileSize: row['File Size'] || '',
          addedDate: row['Added Date'] || '',
          addedBy: row['Added By'] || ''
        });
      }
    }

    if (matching.length === 0) {
      throw new Error('No versions were found for video number: ' + videoNumber);
    }

    // Sort versions descending by version number
    matching.sort(function(a, b) {
      var vA = parseInt(String(a.versionNumber).replace(/\D/g, ''), 10) || 0;
      var vB = parseInt(String(b.versionNumber).replace(/\D/g, ''), 10) || 0;
      return vB - vA;
    });

    // Ensure exactly one current version is identified
    var currentFound = false;
    for (var m = 0; m < matching.length; m++) {
      if (matching[m].isCurrentVersion) {
        if (!currentFound) {
          currentFound = true;
        } else {
          matching[m].isCurrentVersion = false;
        }
      }
    }
    if (!currentFound && matching.length > 0) {
      matching[0].isCurrentVersion = true;
    }

    var currentVer = matching.find(function(v) { return v.isCurrentVersion; }) || matching[0];

    return {
      videoNumber: cleanNum,
      title: currentVer.clientName || currentVer.topic || ('Video ' + cleanNum),
      videoSource: currentVer.videoSource,
      currentVersion: currentVer,
      totalVersions: matching.length,
      versions: matching
    };
  }

  return {
    addProjectVideo: addProjectVideo,
    addMarketingContent: addMarketingContent,
    addNewVersion: addNewVersion,
    getLibraryVideos: getLibraryVideos,
    getVideoVersionHistory: getVideoVersionHistory,
    updateSingleVideoMetadata: updateSingleVideoMetadata
  };
})();


// ==========================================
// FILE: PdfService.gs
// ==========================================
/**
 * Amlaak Video Library — PDF Service
 * Handles architectural unit design PDF uploads, versioning (Decision B), and retrieval.
 */

var PdfService = (function() {
  /**
   * Uploads and registers a unit design PDF with strict versioning.
   */
  function uploadUnitDesignPdf(payload) {
    Auth.requireAuth();

    var validation = Validators.validatePdfUpload(payload);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(function(e) { return e.message; }).join(' | '));
    }

    var unitId = String(payload.unitId).trim();
    var unit = SheetRepository.getUnitById(unitId);
    if (!unit) {
      throw new Error('The specified unit does not exist: ' + unitId);
    }

    return Utils.withLock(20000, function() {
      var nextVerInt = SheetRepository.getNextPdfVersionNumberForUnit(unitId);
      var versionStr = Utils.formatVersionNumber(nextVerInt);
      var pdfNumber = Utils.formatPdfNumber(nextVerInt);
      var recordId = Utils.formatPdfRecordId(unitId, nextVerInt);

      var driveFileId = '';
      var originalFileName = payload.fileName || 'Design.pdf';
      var fileSize = 0;
      var pdfLink = '';

      if (payload.base64Content) {
        // Upload new file to Drive
        var uploadRes = DriveService.uploadDesignPdf(unitId, originalFileName, payload.base64Content);
        driveFileId = uploadRes.fileId;
        originalFileName = uploadRes.fileName;
        fileSize = uploadRes.fileSize;
        pdfLink = uploadRes.url;
      } else if (payload.driveLink) {
        // Registered from existing Drive link
        driveFileId = Validators.extractDriveFileId(payload.driveLink);
        if (!driveFileId) {
          throw new Error('Invalid Drive link for the PDF file.');
        }

        // Duplicate check
        var allPdfs = SheetRepository.getAllPdfs();
        for (var i = 0; i < allPdfs.length; i++) {
          if (allPdfs[i]['Drive File ID'] === driveFileId) {
            throw new Error('This PDF file is already registered in the system (duplicate).');
          }
        }

        var f = DriveService.getFileById(driveFileId);
        DriveService.verifyEditorAccess(f);
        originalFileName = f.getName();
        fileSize = f.getSize();
        pdfLink = f.getUrl();

        // Move to Unit Design PDFs folder
        var pdfFolderId = Config.getProperty(Config.KEYS.UNIT_DESIGN_PDFS_FOLDER_ID);
        if (pdfFolderId) {
          DriveService.moveFile(driveFileId, pdfFolderId);
        }
      }

      // Flip previous versions for this unit to 'No' (Decision B)
      SheetRepository.setPreviousPdfsToNo(unitId, versionStr);

      var docTitle = payload.documentTitle || ('Architectural Design - ' + unit['Client Name'] + ' - ' + versionStr);

      var pdfRecord = {
        pdfRecordId: recordId,
        unitId: unitId,
        documentTitle: docTitle,
        pdfLink: pdfLink,
        driveFileId: driveFileId,
        originalFileName: originalFileName,
        fileSize: fileSize,
        pdfNumber: pdfNumber,
        pdfVersionNumber: versionStr,
        isCurrentVersion: true,
        versionNotes: payload.versionNotes || 'Approved architectural design'
      };

      SheetRepository.insertPdf(pdfRecord);
      AuditService.logSuccess('UPLOAD_UNIT_PDF', 'PDF', recordId, driveFileId,
        'Registered architectural design PDF for unit ' + unitId + ' version ' + versionStr);

      return pdfRecord;
    });
  }

  function getPdfsForUnit(unitId) {
    Auth.requireAuth();
    var all = SheetRepository.getPdfsByUnitId(unitId);
    var list = [];
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      list.push({
        pdfRecordId: p['PDF Record ID'],
        unitId: p['Unit ID'],
        documentTitle: p['Document Title'],
        pdfLink: p['PDF Link'],
        driveFileId: p['Drive File ID'],
        originalFileName: p['Original File Name'],
        pdfNumber: p['PDF Number'],
        pdfVersionNumber: p['PDF Version Number'],
        isCurrentVersion: String(p['Is Current Version']).toLowerCase() === 'yes',
        versionNotes: p['Version Notes'],
        fileSize: p['File Size'],
        addedDate: p['Added Date']
      });
    }
    return list;
  }

  return {
    uploadUnitDesignPdf: uploadUnitDesignPdf,
    getPdfsForUnit: getPdfsForUnit
  };
})();


// ==========================================
// FILE: DashboardService.gs
// ==========================================
/**
 * Amlaak Video Library — Dashboard Service
 * Calculates accurate BI metrics and breakdown distributions according to Section 19.
 */

var DashboardService = (function() {
  function getDashboardData(filters) {
    Auth.requireAuth();

    var allVideoRows = SheetRepository.getAllVideoVersions();
    var allUnits = SheetRepository.getAllUnits();
    var allPdfs = SheetRepository.getAllPdfs();

    var dateFilterType = (filters && filters.dateFilterType) || 'Added Date';
    var startDate = (filters && filters.startDate) || '';
    var endDate = (filters && filters.endDate) || '';

    // Filter rows based on date range
    var matchingRows = [];
    for (var i = 0; i < allVideoRows.length; i++) {
      var row = allVideoRows[i];
      if (startDate || endDate) {
        var dateField = (dateFilterType === 'Shooting Date') ? 'Shooting Date' : 'Added Date';
        var dVal = row[dateField];
        if (dVal) {
          var norm = Utils.normalizeDateString(dVal);
          if (startDate && norm < startDate) continue;
          if (endDate && norm > endDate) continue;
        } else {
          continue;
        }
      }
      matchingRows.push(row);
    }

    // 1. Calculate Logical Videos & Stored Versions
    var distinctLogicalVideos = {};
    var projectLogicalVideos = {};
    var marketingLogicalVideos = {};
    var projectVersionsCount = 0;
    var marketingVersionsCount = 0;

    for (var j = 0; j < matchingRows.length; j++) {
      var r = matchingRows[j];
      var vNum = r['Video Number'];
      var src = r['Video Source'];

      if (vNum) {
        distinctLogicalVideos[vNum] = true;
        if (src === 'Project Video') {
          projectLogicalVideos[vNum] = true;
          projectVersionsCount++;
        } else if (src === 'Marketing Content') {
          marketingLogicalVideos[vNum] = true;
          marketingVersionsCount++;
        }
      }
    }

    var totalLogicalVideos = Object.keys(distinctLogicalVideos).length;
    var totalStoredVersions = matchingRows.length;
    var totalProjectVideos = Object.keys(projectLogicalVideos).length;
    var totalMarketingContent = Object.keys(marketingLogicalVideos).length;

    // 2. Distributions & Breakdowns (calculated per logical video to avoid version skew)
    var locationDist = {};
    var stageDist = {};
    var spaceDist = {};
    var workCategoryDist = {}; // Decision A
    var timelineDist = {};

    var seenLogicalForBreakdown = {};

    for (var k = 0; k < matchingRows.length; k++) {
      var item = matchingRows[k];
      var numKey = item['Video Number'];
      var isCurrent = String(item['Is Current Version']).toLowerCase() === 'yes';

      // Use current version for logical attribute breakdown, or first matching
      if (!seenLogicalForBreakdown[numKey] || isCurrent) {
        seenLogicalForBreakdown[numKey] = item;
      }

      // Timeline can track versions added or shooting
      var dateFieldVal = (dateFilterType === 'Shooting Date') ? item['Shooting Date'] : item['Added Date'];
      if (dateFieldVal) {
        var monthKey = Utils.normalizeDateString(dateFieldVal).substring(0, 7); // YYYY-MM
        if (monthKey && monthKey.length === 7) {
          timelineDist[monthKey] = (timelineDist[monthKey] || 0) + 1;
        }
      }
    }

    for (var lKey in seenLogicalForBreakdown) {
      var lItem = seenLogicalForBreakdown[lKey];

      // Location
      var loc = Utils.normalizeLocation(lItem['Location']);
      if (loc) {
        locationDist[loc] = (locationDist[loc] || 0) + 1;
      }

      // Project Stage (Project Video Type)
      var stage = (lItem['Project Video Type'] || '').trim();
      if (stage) {
        stageDist[stage] = (stageDist[stage] || 0) + 1;
      }

      // Space Type
      var space = (lItem['Space Type'] || '').trim();
      if (space) {
        spaceDist[space] = (spaceDist[space] || 0) + 1;
      }

      // Work Category (Decision A - Confirmed)
      var workCat = (lItem['Work Category'] || '').trim();
      if (workCat) {
        workCategoryDist[workCat] = (workCategoryDist[workCat] || 0) + 1;
      }
    }

    // Convert distributions to sorted array
    function toSortedArray(obj) {
      var arr = [];
      for (var key in obj) {
        arr.push({ name: key, count: obj[key] });
      }
      return arr.sort(function(a, b) { return b.count - a.count; });
    }

    // 3. Recent Activity (Latest from Audit Log, or latest videos)
    var recentActivity = [];
    try {
      var auditRows = SheetRepository.getAllRowsAsObjects(Config.TABS.AUDIT);
      for (var a = auditRows.length - 1; a >= 0 && recentActivity.length < 8; a--) {
        recentActivity.push({
          timestamp: auditRows[a]['Timestamp'],
          user: auditRows[a]['User'],
          action: auditRows[a]['Action'],
          entityId: auditRows[a]['Entity ID'],
          message: auditRows[a]['Safe Message']
        });
      }
    } catch (eAudit) {
      // ignore
    }

    return {
      kpis: {
        totalLogicalVideos: totalLogicalVideos,
        totalStoredVersions: totalStoredVersions,
        totalProjectVideos: totalProjectVideos,
        projectVersionsCount: projectVersionsCount,
        totalMarketingContent: totalMarketingContent,
        marketingVersionsCount: marketingVersionsCount,
        totalUnits: allUnits.length,
        totalStoredPdfs: allPdfs.length
      },
      breakdowns: {
        locations: toSortedArray(locationDist),
        stages: toSortedArray(stageDist),
        spaces: toSortedArray(spaceDist),
        workCategories: toSortedArray(workCategoryDist), // Decision A
        timeline: timelineDist
      },
      recentActivity: recentActivity,
      filterContext: {
        dateFilterType: dateFilterType,
        startDate: startDate,
        endDate: endDate
      }
    };
  }

  /**
   * Consolidated bootstrap endpoint to eliminate initial page load waterfall.
   * Returns user summary, controlled lists, dashboard summary, unit lookups, and safe config in ONE round trip.
   */
  function getBootstrapData() {
    Auth.requireAuth();

    var user = Auth.getCurrentUser();
    var lists = Config.TAXONOMIES;
    var isConfigured = Config.isSystemConfigured();

    var dashboard = getDashboardData();

    var allUnits = SheetRepository.getAllUnits();
    var unitLookups = [];
    for (var u = 0; u < allUnits.length; u++) {
      var un = allUnits[u];
      unitLookups.push({
        unitId: un['Unit ID'],
        clientName: un['Client Name'],
        location: un['Location'],
        unitType: un['Unit Type'],
        area: un['Area (SQM)']
      });
    }

    return {
      user: {
        email: user.email,
        role: user.role,
        isAuthorized: user.isAuthorized
      },
      lists: lists,
      isConfigured: isConfigured,
      dashboard: dashboard,
      unitLookups: unitLookups,
      config: {
        spreadsheetId: Config.getProperty(Config.KEYS.SPREADSHEET_ID) || '',
        rootFolderId: Config.getProperty(Config.KEYS.ROOT_FOLDER_ID) || ''
      }
    };
  }

  return {
    getDashboardData: getDashboardData,
    getBootstrapData: getBootstrapData
  };
})();


// ==========================================
// FILE: Setup.gs
// ==========================================
/**
 * Amlaak Video Library — System Setup & Resource Provisioning
 * Fully idempotent provisioning for Google Drive folders and Google Sheets database.
 * Supports Mode A (Connect Existing) and Mode B (Automated Provisioning).
 */

var Setup = (function() {
  /**
   * Idempotently configures the entire system.
   */
  function setupSystem(optConfig) {
    var userEmail = Auth.getCurrentUserEmail();
    var results = {
      spreadsheetId: '',
      spreadsheetUrl: '',
      rootFolderId: '',
      projectVideosFolderId: '',
      marketingContentFolderId: '',
      unitDesignPdfsFolderId: '',
      tabsCreated: [],
      foldersCreated: [],
      status: 'SUCCESS',
      message: ''
    };

    try {
      // 1. Spreadsheet Setup
      var ss;
      var ssId = (optConfig && optConfig.spreadsheetId) ? optConfig.spreadsheetId : Config.getProperty(Config.KEYS.SPREADSHEET_ID);
      if (ssId) {
        ss = SpreadsheetApp.openById(ssId);
      } else {
        ss = SpreadsheetApp.create('Amlaak Video Library — Master Database');
        ssId = ss.getId();
        results.tabsCreated.push('Created new Spreadsheet: ' + ss.getName());
      }
      results.spreadsheetId = ssId;
      results.spreadsheetUrl = ss.getUrl();

      // Configure Tabs & Schemas
      setupTabs(ss, userEmail, results);

      // 2. Drive Folders Setup
      setupFolders(optConfig, results);

      // 3. Save Configuration Properties
      var props = {};
      props[Config.KEYS.SPREADSHEET_ID] = ssId;
      props[Config.KEYS.ROOT_FOLDER_ID] = results.rootFolderId;
      props[Config.KEYS.PROJECT_VIDEOS_FOLDER_ID] = results.projectVideosFolderId;
      props[Config.KEYS.MARKETING_CONTENT_FOLDER_ID] = results.marketingContentFolderId;
      props[Config.KEYS.UNIT_DESIGN_PDFS_FOLDER_ID] = results.unitDesignPdfsFolderId;
      props[Config.KEYS.TIMEZONE] = (optConfig && optConfig.timezone) ? optConfig.timezone : 'Africa/Cairo';
      props[Config.KEYS.SYSTEM_INITIALIZED] = 'TRUE';

      Config.setProperties(props);

      // 4. Audit Log
      AuditService.logSuccess('SYSTEM_SETUP', 'System', ssId, results.rootFolderId,
        'Amlaak Video Library system was set up successfully. Owner: ' + userEmail);

      results.message = 'System setup completed successfully and the database and Drive folders were linked.';
      return results;
    } catch (e) {
      results.status = 'ERROR';
      results.message = e.message || e.toString();
      return results;
    }
  }

  function setupTabs(ss, ownerEmail, results) {
    var tabsDef = [
      {
        name: Config.TABS.UNITS,
        headers: [
          'Unit ID', 'Client Name', 'Location', 'Unit Type', 'Area (SQM)',
          'Created Date', 'Created By', 'Updated Date', 'Updated By'
        ]
      },
      {
        name: Config.TABS.VIDEOS,
        headers: [
          'Video Number', 'Version Number', 'Is Current Version', 'Version Notes',
          'Video Name', 'Video Source', 'Unit ID', 'Content Type', 'Topic',
          'Client Name', 'Location', 'Unit Type', 'Area (SQM)', 'Project Video Type',
          'Space Type', 'Work Category', 'Shooting Date', 'Video Link', 'Drive File ID',
          'Original File Name', 'Duration', 'Orientation', 'File Type', 'File Size',
          'Added Date', 'Added By', 'Updated Date', 'Updated By'
        ]
      },
      {
        name: Config.TABS.PDFS,
        headers: [
          'PDF Record ID', 'Unit ID', 'Document Title', 'PDF Link', 'Drive File ID',
          'Original File Name', 'File Type', 'File Size', 'PDF Number',
          'PDF Version Number', 'Is Current Version', 'Version Notes',
          'Added Date', 'Added By', 'Updated Date', 'Updated By'
        ]
      },
      {
        name: Config.TABS.LISTS,
        headers: [
          'Video Source', 'Unit Type', 'Project Video Type', 'Space Type',
          'Marketing Content Type', 'Work Category'
        ]
      },
      {
        name: Config.TABS.USERS,
        headers: ['Email', 'Active', 'Role', 'Added Date']
      },
      {
        name: Config.TABS.AUDIT,
        headers: [
          'Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID',
          'Drive File ID', 'Result', 'Error Code', 'Safe Message'
        ]
      },
      {
        name: Config.TABS.CONFIG,
        headers: ['Key', 'Value', 'Description', 'Updated Date']
      }
    ];

    for (var t = 0; t < tabsDef.length; t++) {
      var def = tabsDef[t];
      var sheet = ss.getSheetByName(def.name);
      var isNew = false;
      if (!sheet) {
        sheet = ss.insertSheet(def.name);
        isNew = true;
        results.tabsCreated.push(def.name);
      }

      // Check header row
      var lastCol = sheet.getLastColumn();
      if (lastCol === 0 || sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
        formatHeaderRow(sheet, def.headers.length);
      } else if (!isNew && lastCol > 0) {
        // Idempotent schema migration: append any missing columns safely without shifting existing data
        var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        var existingHeaderSet = {};
        for (var eh = 0; eh < existingHeaders.length; eh++) {
          var ehStr = String(existingHeaders[eh]).trim().toLowerCase();
          if (ehStr) existingHeaderSet[ehStr] = true;
        }

        for (var reqH = 0; reqH < def.headers.length; reqH++) {
          var reqHeaderName = def.headers[reqH];
          if (!existingHeaderSet[reqHeaderName.toLowerCase()]) {
            var newColIdx = sheet.getLastColumn() + 1;
            sheet.getRange(1, newColIdx).setValue(reqHeaderName);
            formatHeaderRow(sheet, sheet.getLastColumn());
            results.columnsAdded = results.columnsAdded || [];
            results.columnsAdded.push(def.name + ': ' + reqHeaderName);
          }
        }
      }

      // Populate default data if tab is new
      if (isNew) {
        if (def.name === Config.TABS.LISTS) {
          populateDefaultLists(sheet);
        } else if (def.name === Config.TABS.USERS && ownerEmail) {
          sheet.appendRow([ownerEmail, 'Yes', 'System Owner', Utils.formatDateTime(new Date())]);
          sheet.appendRow(['user1@amlaak.com', 'Yes', 'Authorised User 1', Utils.formatDateTime(new Date())]);
          sheet.appendRow(['user2@amlaak.com', 'Yes', 'Authorised User 2', Utils.formatDateTime(new Date())]);
        }
      }
    }

    // Remove default 'Sheet1' if exists and empty
    var sheet1 = ss.getSheetByName('Sheet1');
    if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
      try { ss.deleteSheet(sheet1); } catch(e) {}
    }
  }

  function formatHeaderRow(sheet, colCount) {
    var range = sheet.getRange(1, 1, 1, colCount);
    // Amlaak Brand Styling for Header: Navy background, White/Gold bold text
    range.setBackground('#0B1528')
         .setFontColor('#FFFFFF')
         .setFontWeight('bold')
         .setFontFamily('Cairo')
         .setFontSize(10)
         .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }

  function populateDefaultLists(sheet) {
    var maxLen = 0;
    for (var k in Config.TAXONOMIES) {
      if (Config.TAXONOMIES[k].length > maxLen) {
        maxLen = Config.TAXONOMIES[k].length;
      }
    }

    var matrix = [];
    for (var r = 0; r < maxLen; r++) {
      matrix.push([
        Config.TAXONOMIES.videoSource[r] || '',
        Config.TAXONOMIES.unitType[r] || '',
        Config.TAXONOMIES.projectVideoType[r] || '',
        Config.TAXONOMIES.spaceType[r] || '',
        Config.TAXONOMIES.marketingContentType[r] || '',
        Config.TAXONOMIES.workCategory[r] || '' // Decision A
      ]);
    }

    if (matrix.length > 0) {
      sheet.getRange(2, 1, matrix.length, 6).setValues(matrix);
    }
  }

  function setupFolders(optConfig, results) {
    var rootFolder;
    var rootFolderId = (optConfig && optConfig.rootFolderId) ? optConfig.rootFolderId : Config.getProperty(Config.KEYS.ROOT_FOLDER_ID);

    if (rootFolderId) {
      rootFolder = DriveApp.getFolderById(rootFolderId);
    } else {
      // Find or create 'Amlaak Video Library'
      var existingRoots = DriveApp.getFoldersByName(Config.FOLDERS.ROOT);
      if (existingRoots.hasNext()) {
        rootFolder = existingRoots.next();
      } else {
        rootFolder = DriveApp.createFolder(Config.FOLDERS.ROOT);
        results.foldersCreated.push(Config.FOLDERS.ROOT);
      }
    }
    results.rootFolderId = rootFolder.getId();

    // Subfolder helper
    function getOrCreateSubfolder(parent, folderName) {
      var it = parent.getFoldersByName(folderName);
      if (it.hasNext()) {
        return it.next().getId();
      }
      var created = parent.createFolder(folderName);
      results.foldersCreated.push(folderName);
      return created.getId();
    }

    results.projectVideosFolderId = getOrCreateSubfolder(rootFolder, Config.FOLDERS.PROJECT_VIDEOS);
    results.marketingContentFolderId = getOrCreateSubfolder(rootFolder, Config.FOLDERS.MARKETING_CONTENT);
    results.unitDesignPdfsFolderId = getOrCreateSubfolder(rootFolder, Config.FOLDERS.UNIT_DESIGN_PDFS);
  }

  return {
    setupSystem: setupSystem
  };
})();


// ==========================================
// FILE: Code.gs
// ==========================================
/**
 * Amlaak Video Library — Web App Controller & Server API Gateways
 * Entry points for HTML Service and asynchronous google.script.run calls.
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Amlaak Video Library')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Universal safe API wrapper.
 */
function handleApiCall(serviceFn, actionName, entityType) {
  try {
    var data = serviceFn();
    return Utils.successResponse(data);
  } catch (error) {
    var errMsg = error.message || error.toString();
    var errCode = 'EXECUTION_ERROR';
    if (errMsg.indexOf('not authorized') !== -1 || errMsg.indexOf('Access Denied') !== -1) {
      errCode = 'UNAUTHORIZED';
    } else if (errMsg.indexOf("isn't editable by your Google account") !== -1) {
      errCode = 'PERMISSION_DENIED';
    } else if (errMsg.indexOf('already registered') !== -1 || errMsg.indexOf('duplicate') !== -1) {
      errCode = 'DUPLICATE_FILE';
    }

    AuditService.logFailure(actionName || 'API_CALL', entityType || 'System', '', '', errCode, errMsg);
    return Utils.errorResponse(errCode, errMsg);
  }
}

// ==========================================
// PUBLIC CLIENT GATEWAYS
// ==========================================

function apiGetAppBootstrapData() {
  return handleApiCall(function() {
    return DashboardService.getBootstrapData();
  }, 'GET_APP_BOOTSTRAP_DATA', 'System');
}

function apiGetInitialData() {
  return handleApiCall(function() {
    var user = Auth.requireAuth();
    var lists = SheetRepository.getLists();
    var config = Config.getAllProperties();
    return {
      user: user,
      lists: lists,
      isConfigured: !!(config.SPREADSHEET_ID && config.ROOT_FOLDER_ID)
    };
  }, 'GET_INITIAL_DATA', 'Auth');
}

function apiGetDashboard(filters) {
  return handleApiCall(function() {
    return DashboardService.getDashboardData(filters);
  }, 'GET_DASHBOARD', 'Dashboard');
}

function apiGetVideos(filters) {
  return handleApiCall(function() {
    return VideoService.getLibraryVideos(filters);
  }, 'GET_VIDEOS', 'Video');
}

function apiAddProjectVideo(payload) {
  return handleApiCall(function() {
    return VideoService.addProjectVideo(payload);
  }, 'ADD_PROJECT_VIDEO', 'Video');
}

function apiAddMarketingContent(payload) {
  return handleApiCall(function() {
    return VideoService.addMarketingContent(payload);
  }, 'ADD_MARKETING_CONTENT', 'Video');
}

function apiAddNewVersion(payload) {
  return handleApiCall(function() {
    return VideoService.addNewVersion(payload);
  }, 'ADD_NEW_VERSION', 'Video');
}

function apiGetVideoVersionHistory(videoNumber) {
  return handleApiCall(function() {
    return VideoService.getVideoVersionHistory(videoNumber);
  }, 'GET_VIDEO_VERSION_HISTORY', 'Video');
}

function apiUpdateSingleVideoMetadata(driveFileId, fields, confirmRename) {
  return handleApiCall(function() {
    return VideoService.updateSingleVideoMetadata(driveFileId, fields, confirmRename);
  }, 'UPDATE_SINGLE_VIDEO', 'Video');
}

function apiGetUnits() {
  return handleApiCall(function() {
    return UnitService.getUnits();
  }, 'GET_UNITS', 'Unit');
}

function apiGetUnitDetail(unitId) {
  return handleApiCall(function() {
    return UnitService.getUnitDetail(unitId);
  }, 'GET_UNIT_DETAIL', 'Unit');
}

function apiCreateUnit(payload) {
  return handleApiCall(function() {
    return UnitService.createUnit(payload);
  }, 'CREATE_UNIT', 'Unit');
}

function apiUpdateUnit(unitId, fields, optExecuteBatchRename) {
  return handleApiCall(function() {
    return UnitService.updateUnit(unitId, fields, optExecuteBatchRename);
  }, 'UPDATE_UNIT', 'Unit');
}

function apiUploadPdf(payload) {
  return handleApiCall(function() {
    return PdfService.uploadUnitDesignPdf(payload);
  }, 'UPLOAD_PDF', 'PDF');
}

function apiSetupSystem(optConfig) {
  return handleApiCall(function() {
    Auth.requireOwner();
    return Setup.setupSystem(optConfig);
  }, 'SETUP_SYSTEM', 'Setup');
}

function apiGetSystemConfig() {
  return handleApiCall(function() {
    Auth.requireOwner();
    var props = Config.getAllProperties();
    return {
      spreadsheetId: props.SPREADSHEET_ID || '',
      rootFolderId: props.ROOT_FOLDER_ID || '',
      projectVideosFolderId: props.PROJECT_VIDEOS_FOLDER_ID || '',
      marketingContentFolderId: props.MARKETING_CONTENT_FOLDER_ID || '',
      unitDesignPdfsFolderId: props.UNIT_DESIGN_PDFS_FOLDER_ID || '',
      timezone: props.TIMEZONE || 'Africa/Cairo',
      users: Auth.getAllowlistFromSheet()
    };
  }, 'GET_CONFIG', 'Config');
}


