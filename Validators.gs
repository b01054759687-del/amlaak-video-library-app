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
