/**
 * Unit Design PDF Upload & Version History Service (§8, §12)
 */
const sheetsService = require('./sheets.service');
const auditService = require('./audit.service');
const { validatePdf } = require('../utils/validators');

async function uploadPdf(payload, user) {
  const v = validatePdf(payload);
  if (!v.isValid) throw new Error(v.error);

  const unit = await sheetsService.getUnitById(payload.unitId);
  if (!unit) throw new Error('Unit not found: ' + payload.unitId);

  const existingPdfs = await sheetsService.getPdfsByUnitId(payload.unitId);

  // Auto increment version
  let maxV = 0;
  existingPdfs.forEach(p => {
    const m = String(p.pdfVersionNumber).match(/V?(\d+)/i);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (n > maxV) maxV = n;
    }
  });

  const nextVer = 'V' + String(maxV + 1).padStart(2, '0');

  // Mark previous versions false
  existingPdfs.forEach(p => {
    p.isCurrentVersion = false;
  });

  const pdfRecord = {
    pdfRecordId: `${payload.unitId}-PDF-${String(maxV + 1).padStart(2, '0')}`,
    unitId: payload.unitId,
    pdfVersionNumber: nextVer,
    isCurrentVersion: true,
    documentTitle: (payload.documentTitle || payload.fileName).trim(),
    driveFileId: payload.driveFileId || ('mock_pdf_drive_' + Date.now()),
    versionNotes: payload.versionNotes || '',
    addedDate: new Date().toISOString().split('T')[0],
    addedBy: user ? user.email : 'system'
  };

  await sheetsService.addPdf(pdfRecord);
  await auditService.logAction('UPLOAD_PDF', 'PDF', pdfRecord.pdfRecordId, user, `Uploaded ${pdfRecord.documentTitle} as ${nextVer}`);

  return {
    versionNumber: nextVer,
    pdf: pdfRecord
  };
}

module.exports = { uploadPdf };
