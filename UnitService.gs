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
