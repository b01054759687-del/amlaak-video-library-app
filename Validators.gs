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
      errors.push({ field: 'videoLink', message: 'رابط Google Drive غير صالح أو لم يتم العثور على File ID صحيح.' });
    }

    if (!payload.clientName || !String(payload.clientName).trim()) {
      errors.push({ field: 'clientName', message: 'اسم العميل مطلوب.' });
    }

    if (!payload.location || !String(payload.location).trim()) {
      errors.push({ field: 'location', message: 'الموقع/المنطقة الجغرافية مطلوبة.' });
    }

    if (!payload.unitType || !String(payload.unitType).trim()) {
      errors.push({ field: 'unitType', message: 'نوع الوحدة مطلوب.' });
    } else if (Config.TAXONOMIES.unitType.indexOf(payload.unitType) === -1) {
      errors.push({ field: 'unitType', message: 'نوع الوحدة المختار غير مدرج في القائمة المعتمدة.' });
    }

    if (payload.area !== undefined && payload.area !== null && String(payload.area).trim() !== '') {
      var num = Number(payload.area);
      if (isNaN(num) || num <= 0) {
        errors.push({ field: 'area', message: 'المساحة بالمتر المربع يجب أن تكون رقماً موجباً.' });
      }
    }

    if (!payload.projectVideoType || !String(payload.projectVideoType).trim()) {
      errors.push({ field: 'projectVideoType', message: 'مرحلة الفيديو (Project Video Type) مطلوبة.' });
    } else if (Config.TAXONOMIES.projectVideoType.indexOf(payload.projectVideoType) === -1) {
      errors.push({ field: 'projectVideoType', message: 'مرحلة الفيديو غير مدرجة في القائمة المعتمدة.' });
    }

    if (!payload.spaceType || !String(payload.spaceType).trim()) {
      errors.push({ field: 'spaceType', message: 'نوع الفراغ (Space Type) مطلوب.' });
    } else if (Config.TAXONOMIES.spaceType.indexOf(payload.spaceType) === -1) {
      errors.push({ field: 'spaceType', message: 'نوع الفراغ غير مدرج في القائمة المعتمدة.' });
    }

    // Section 8.6 Work Category (Decision A - Confirmed)
    if (!payload.workCategory || !String(payload.workCategory).trim()) {
      errors.push({ field: 'workCategory', message: 'تصنيف الأعمال (Work Category) مطلوب.' });
    } else if (Config.TAXONOMIES.workCategory.indexOf(payload.workCategory) === -1) {
      errors.push({ field: 'workCategory', message: 'تصنيف الأعمال غير مدرج في القائمة المعتمدة.' });
    }

    if (!payload.shootingDate || !Utils.normalizeDateString(payload.shootingDate)) {
      errors.push({ field: 'shootingDate', message: 'تاريخ التصوير (Shooting Date) مطلوب بصيغة صحيحة (YYYY-MM-DD).' });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  function validateMarketingContent(payload) {
    var errors = [];

    if (!payload.videoLink || !extractDriveFileId(payload.videoLink)) {
      errors.push({ field: 'videoLink', message: 'رابط Google Drive غير صالح أو لم يتم العثور على File ID صحيح.' });
    }

    if (!payload.contentType || !String(payload.contentType).trim()) {
      errors.push({ field: 'contentType', message: 'نوع المحتوى التسويقي (Content Type) مطلوب.' });
    } else if (Config.TAXONOMIES.marketingContentType.indexOf(payload.contentType) === -1) {
      errors.push({ field: 'contentType', message: 'نوع المحتوى التسويقي غير مدرج في القائمة المعتمدة.' });
    }

    if (!payload.topic || !String(payload.topic).trim()) {
      errors.push({ field: 'topic', message: 'موضوع الفيديو (Topic) مطلوب.' });
    }

    if (!payload.shootingDate || !Utils.normalizeDateString(payload.shootingDate)) {
      errors.push({ field: 'shootingDate', message: 'تاريخ التصوير (Shooting Date) مطلوب بصيغة صحيحة (YYYY-MM-DD).' });
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
      errors.push({ field: 'clientName', message: 'اسم العميل مطلوب.' });
    }

    if (!payload.location || !String(payload.location).trim()) {
      errors.push({ field: 'location', message: 'الموقع/المنطقة الجغرافية مطلوبة.' });
    }

    if (!payload.unitType || !String(payload.unitType).trim()) {
      errors.push({ field: 'unitType', message: 'نوع الوحدة مطلوب.' });
    }

    if (payload.area !== undefined && payload.area !== null && String(payload.area).trim() !== '') {
      var num = Number(payload.area);
      if (isNaN(num) || num <= 0) {
        errors.push({ field: 'area', message: 'المساحة بالمتر المربع يجب أن تكون رقماً موجباً.' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  function validatePdfUpload(payload) {
    var errors = [];

    if (!payload.unitId || !String(payload.unitId).trim()) {
      errors.push({ field: 'unitId', message: 'كود الوحدة (Unit ID) مطلوب لربط ملف التصميم.' });
    }

    if (!payload.base64Content && !payload.driveLink) {
      errors.push({ field: 'file', message: 'ملف الـ PDF أو رابط الـ Drive مطلوب.' });
    }

    if (payload.fileName && !payload.fileName.toLowerCase().endsWith('.pdf')) {
      errors.push({ field: 'fileName', message: 'الملف المرفوع يجب أن يكون بامتداد PDF فقط.' });
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
