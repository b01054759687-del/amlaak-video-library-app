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
      throw new Error('لم يتم تكوين معرف جدول البيانات (SPREADSHEET_ID missing).');
    }
    _cachedSpreadsheet = SpreadsheetApp.openById(ssId);
    return _cachedSpreadsheet;
  }

  function getSheet(tabName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      throw new Error('لم يتم العثور على ورقة العمل المطلوبة: ' + tabName);
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
      if (col) rowValues[col - 1] = val;
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
        sheet.getRange(targetRow, col).setValue(updatedFields[key]);
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
            if (clientCol && unitRecord.clientName !== undefined) videoSheet.getRange(actualRow, clientCol).setValue(unitRecord.clientName);
            if (locCol && unitRecord.location !== undefined) videoSheet.getRange(actualRow, locCol).setValue(unitRecord.location);
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
      if (col) rowValues[col - 1] = (val !== undefined && val !== null) ? val : '';
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
        sheet.getRange(targetRow, col).setValue(updatedFields[key]);
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
      if (col) rowValues[col - 1] = (val !== undefined && val !== null) ? val : '';
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
