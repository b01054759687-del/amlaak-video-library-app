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
