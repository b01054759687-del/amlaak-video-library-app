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
