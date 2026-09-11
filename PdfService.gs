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
      throw new Error('الوحدة المحددة غير موجودة: ' + unitId);
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
      } else if (payload.driveFileId || payload.driveLink) {
        // Registered directly from Drive upload or existing Drive link (§15)
        driveFileId = payload.driveFileId ? String(payload.driveFileId).trim() : Validators.extractDriveFileId(payload.driveLink);
        if (!driveFileId) {
          throw new Error('معرف أو رابط Drive غير صالح لملف الـ PDF.');
        }

        // Duplicate check
        var allPdfs = SheetRepository.getAllPdfs();
        for (var i = 0; i < allPdfs.length; i++) {
          if (allPdfs[i]['Drive File ID'] === driveFileId) {
            throw new Error('ملف الـ PDF هذا مسجل بالفعل في المنظومة.');
          }
        }

        var f = DriveService.getFileById(driveFileId);
        DriveService.verifyEditorAccess(f);
        originalFileName = payload.fileName || f.getName();
        fileSize = f.getSize() || payload.fileSize || 0;
        pdfLink = f.getUrl();

        // Move to Unit Design PDFs folder if configured
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
        versionNotes: payload.versionNotes || 'تصميم معماري معتمد'
      };

      SheetRepository.insertPdf(pdfRecord);
      AuditService.logSuccess('UPLOAD_UNIT_PDF', 'PDF', recordId, driveFileId,
        'تم تسجيل مخطط تصميم هندسي (PDF) للوحدة ' + unitId + ' نسخة ' + versionStr);

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
