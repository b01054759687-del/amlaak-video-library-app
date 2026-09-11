/**
 * Amlaak Video Library — Web App Controller & Server API Gateways
 * Entry points for HTML Service and asynchronous google.script.run calls.
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Amlaak Video Library')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Universal safe API wrapper.
 */
function handleApiCall(serviceFn, actionName, entityType) {
  try {
    var data = serviceFn();
    return Utils.successResponse(data);
  } catch (error) {
    var errMsg = error.message || error.toString();
    var errCode = 'EXECUTION_ERROR';
    if (errMsg.indexOf('not authorized') !== -1 || errMsg.indexOf('Access Denied') !== -1) {
      errCode = 'UNAUTHORIZED';
    } else if (errMsg.indexOf("isn't shared with the app account") !== -1) {
      errCode = 'PERMISSION_DENIED';
    } else if (errMsg.indexOf('already registered') !== -1 || errMsg.indexOf('duplicate') !== -1) {
      errCode = 'DUPLICATE_FILE';
    }

    AuditService.logFailure(actionName || 'API_CALL', entityType || 'System', '', '', errCode, errMsg);
    return Utils.errorResponse(errCode, errMsg);
  }
}

// ==========================================
// PUBLIC CLIENT GATEWAYS
// ==========================================

function apiGetAppBootstrapData() {
  return handleApiCall(function() {
    return DashboardService.getBootstrapData();
  }, 'GET_APP_BOOTSTRAP_DATA', 'System');
}

function apiGetInitialData() {
  return handleApiCall(function() {
    var user = Auth.requireAuth();
    var lists = SheetRepository.getLists();
    var config = Config.getAllProperties();
    return {
      user: user,
      lists: lists,
      isConfigured: !!(config.SPREADSHEET_ID && config.ROOT_FOLDER_ID)
    };
  }, 'GET_INITIAL_DATA', 'Auth');
}

function apiGetDashboard(filters) {
  return handleApiCall(function() {
    return DashboardService.getDashboardData(filters);
  }, 'GET_DASHBOARD', 'Dashboard');
}

function apiGetVideos(filters) {
  return handleApiCall(function() {
    return VideoService.getLibraryVideos(filters);
  }, 'GET_VIDEOS', 'Video');
}

function apiAddProjectVideo(payload) {
  return handleApiCall(function() {
    return VideoService.addProjectVideo(payload);
  }, 'ADD_PROJECT_VIDEO', 'Video');
}

function apiAddMarketingContent(payload) {
  return handleApiCall(function() {
    return VideoService.addMarketingContent(payload);
  }, 'ADD_MARKETING_CONTENT', 'Video');
}

function apiAddNewVersion(payload) {
  return handleApiCall(function() {
    return VideoService.addNewVersion(payload);
  }, 'ADD_NEW_VERSION', 'Video');
}

function apiGetVideoVersionHistory(videoNumber) {
  return handleApiCall(function() {
    return VideoService.getVideoVersionHistory(videoNumber);
  }, 'GET_VIDEO_VERSION_HISTORY', 'Video');
}

function apiUpdateSingleVideoMetadata(driveFileId, fields, confirmRename) {
  return handleApiCall(function() {
    return VideoService.updateSingleVideoMetadata(driveFileId, fields, confirmRename);
  }, 'UPDATE_SINGLE_VIDEO', 'Video');
}

function apiGetUnits() {
  return handleApiCall(function() {
    return UnitService.getUnits();
  }, 'GET_UNITS', 'Unit');
}

function apiGetUnitDetail(unitId) {
  return handleApiCall(function() {
    return UnitService.getUnitDetail(unitId);
  }, 'GET_UNIT_DETAIL', 'Unit');
}

function apiCreateUnit(payload) {
  return handleApiCall(function() {
    return UnitService.createUnit(payload);
  }, 'CREATE_UNIT', 'Unit');
}

function apiUpdateUnit(unitId, fields, optExecuteBatchRename) {
  return handleApiCall(function() {
    return UnitService.updateUnit(unitId, fields, optExecuteBatchRename);
  }, 'UPDATE_UNIT', 'Unit');
}

function apiUploadPdf(payload) {
  return handleApiCall(function() {
    return PdfService.uploadUnitDesignPdf(payload);
  }, 'UPLOAD_PDF', 'PDF');
}

function apiSetupSystem(optConfig) {
  return handleApiCall(function() {
    Auth.requireOwner();
    return Setup.setupSystem(optConfig);
  }, 'SETUP_SYSTEM', 'Setup');
}

function apiGetSystemConfig() {
  return handleApiCall(function() {
    Auth.requireOwner();
    var props = Config.getAllProperties();
    return {
      spreadsheetId: props.SPREADSHEET_ID || '',
      rootFolderId: props.ROOT_FOLDER_ID || '',
      projectVideosFolderId: props.PROJECT_VIDEOS_FOLDER_ID || '',
      marketingContentFolderId: props.MARKETING_CONTENT_FOLDER_ID || '',
      unitDesignPdfsFolderId: props.UNIT_DESIGN_PDFS_FOLDER_ID || '',
      timezone: props.TIMEZONE || 'Africa/Cairo',
      users: Auth.getAllowlistFromSheet()
    };
  }, 'GET_CONFIG', 'Config');
}
