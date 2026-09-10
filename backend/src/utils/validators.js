/**
 * Strict Input Validation (§8, §10, §12)
 */
const APPROVED_WORK_CATEGORIES = [
  'Roof', 'Ceiling', 'Materials', 'Furniture', 'Decoration',
  'HDF', 'Ceramics', 'Electrical', 'Gypsum Board', 'Air Conditioning',
  'Sound System', 'Doors', 'Windows', 'Painting', 'Plastering'
];

function extractDriveFileId(urlOrId) {
  if (!urlOrId) return '';
  const input = String(urlOrId).trim();
  let match = input.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) return match[1];
  match = input.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) return match[1];
  match = input.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(input)) return input;
  return '';
}

function validateProjectVideo(p) {
  if (!p) return { isValid: false, error: 'Empty payload' };
  const fileId = extractDriveFileId(p.videoLink || p.driveFileId);
  if (!fileId) return { isValid: false, error: 'Invalid Google Drive link or File ID' };
  if (!p.clientName || !p.clientName.trim()) return { isValid: false, error: 'Client name is required' };
  if (!p.location || !p.location.trim()) return { isValid: false, error: 'Location is required' };
  if (!p.projectVideoType) return { isValid: false, error: 'Project video type is required' };
  if (!p.spaceType) return { isValid: false, error: 'Space type is required' };
  if (p.workCategory && !APPROVED_WORK_CATEGORIES.includes(p.workCategory)) {
    return { isValid: false, error: 'Invalid work category: ' + p.workCategory };
  }
  if (!p.shootingDate) return { isValid: false, error: 'Shooting date is required' };
  return { isValid: true, fileId };
}

function validateMarketingContent(p) {
  if (!p) return { isValid: false, error: 'Empty payload' };
  const fileId = extractDriveFileId(p.videoLink || p.driveFileId);
  if (!fileId) return { isValid: false, error: 'Invalid Google Drive link or File ID' };
  if (!p.contentType) return { isValid: false, error: 'Content type is required' };
  if (!p.topic || !p.topic.trim()) return { isValid: false, error: 'Topic is required' };
  if (!p.shootingDate) return { isValid: false, error: 'Shooting date is required' };
  return { isValid: true, fileId };
}

function validateUnit(p) {
  if (!p) return { isValid: false, error: 'Empty payload' };
  if (!p.clientName || !p.clientName.trim()) return { isValid: false, error: 'Client name is required' };
  if (!p.location || !p.location.trim()) return { isValid: false, error: 'Location is required' };
  if (!p.unitType || !p.unitType.trim()) return { isValid: false, error: 'Unit type is required' };
  if (p.area !== undefined && p.area !== '' && (isNaN(p.area) || Number(p.area) <= 0)) {
    return { isValid: false, error: 'Area must be a positive number' };
  }
  return { isValid: true };
}

function validatePdf(p) {
  if (!p) return { isValid: false, error: 'Empty payload' };
  if (!p.unitId) return { isValid: false, error: 'Unit ID is required for PDF upload' };
  if (!p.fileName || !p.fileName.toLowerCase().endsWith('.pdf')) {
    return { isValid: false, error: 'Only .pdf files are accepted' };
  }
  return { isValid: true };
}

module.exports = {
  APPROVED_WORK_CATEGORIES,
  extractDriveFileId,
  validateProjectVideo,
  validateMarketingContent,
  validateUnit,
  validatePdf
};
