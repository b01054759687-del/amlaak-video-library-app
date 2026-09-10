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
      throw new Error('تعذر استخراج معرف الملف (File ID) من الرابط.');
    }

    // 3. Duplicate check
    var existingRecord = SheetRepository.getVideoByDriveFileId(fileId);
    if (existingRecord) {
      throw new Error('هذا الملف مسجل بالفعل في المنظومة تحت الفيديو رقم: ' + existingRecord['Video Number'] + ' (' + existingRecord['Version Number'] + ')');
    }

    // 4. Inspect Drive file and verify Editor access
    var fileInspection = DriveService.validateAndInspectVideoFile(fileId);

    // 5. Ensure destination folder
    var destFolderId = Config.getProperty(Config.KEYS.PROJECT_VIDEOS_FOLDER_ID);
    if (!destFolderId) {
      throw new Error('لم يتم تعيين مجلد فيديوهات المشاريع (PROJECT_VIDEOS_FOLDER_ID missing).');
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
        versionNotes: payload.versionNotes || 'النسخة الأصلية الأولى',
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
          versionNotes: 'مرفق مع الفيديو رقم ' + videoNumber
        });
      }

      // 13. Audit Log
      AuditService.logSuccess('ADD_PROJECT_VIDEO', 'Video', videoNumber + '-' + versionNumber, fileId,
        'تم تسجيل فيديو مشروع جديد بنجاح: ' + organizedName);

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
      throw new Error('تعذر استخراج معرف الملف (File ID) من الرابط.');
    }

    // 3. Duplicate check
    var existingRecord = SheetRepository.getVideoByDriveFileId(fileId);
    if (existingRecord) {
      throw new Error('هذا الملف مسجل بالفعل في المنظومة تحت الفيديو رقم: ' + existingRecord['Video Number']);
    }

    // 4. Inspect Drive file and verify Editor access
    var fileInspection = DriveService.validateAndInspectVideoFile(fileId);

    // 5. Destination folder
    var destFolderId = Config.getProperty(Config.KEYS.MARKETING_CONTENT_FOLDER_ID);
    if (!destFolderId) {
      throw new Error('لم يتم تعيين مجلد المحتوى التسويقي (MARKETING_CONTENT_FOLDER_ID missing).');
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
        versionNotes: payload.versionNotes || 'النسخة الأصلية الأولى',
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
        'تم تسجيل محتوى تسويقي جديد: ' + organizedName);

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
      throw new Error('رقم الفيديو (Video Number) مطلوب لإضافة نسخة جديدة.');
    }

    var fileId = Validators.extractDriveFileId(payload.videoLink);
    if (!fileId) {
      throw new Error('رابط Google Drive غير صالح أو لم يتم العثور على File ID.');
    }

    // Duplicate check
    var existingRecord = SheetRepository.getVideoByDriveFileId(fileId);
    if (existingRecord) {
      throw new Error('هذا الملف مستخدم بالفعل كنسخة أخرى في المنظومة (Drive File ID duplicate).');
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
        throw new Error('الفيديو الأصلي غير موجود: ' + videoNumber);
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
        versionNotes: payload.versionNotes || 'تعديل جديد',
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
        'تمت إضافة نسخة جديدة (' + versionStr + ') للفيديو ' + videoNumber + ': ' + organizedName);

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
      throw new Error('ملف الفيديو غير موجود: ' + driveFileId);
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
          message: 'التعديل يغير اسم الملف المعتمد. يرجى تأكيد إعادة تسمية الملف على Google Drive.'
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
          'تمت إعادة التسمية من ' + currentName + ' إلى ' + proposedName);
      }

      SheetRepository.updateVideoMetadata(driveFileId, sheetUpdates);
      AuditService.logSuccess('UPDATE_VIDEO_METADATA', 'Video', existing['Video Number'], driveFileId,
        'تم تحديث البيانات الوصفية للفيديو.');

      return {
        success: true,
        newName: proposedName,
        message: 'تم تحديث بيانات الفيديو بنجاح.'
      };
    });
  }

  /**
   * Retrieves the full version history for a logical video.
   */
  function getVideoVersionHistory(videoNumber) {
    Auth.requireAuth();

    if (!videoNumber || !String(videoNumber).trim()) {
      throw new Error('رقم الفيديو (Video Number) مطلوب.');
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
      throw new Error('لم يتم العثور على أي نسخ للفيديو رقم: ' + videoNumber);
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
