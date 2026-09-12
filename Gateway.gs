/**
 * Amlaak Video Library — GitHub Pages JSON Gateway
 * Single entry point (doPost, wired in Code.gs) for the GitHub Pages
 * frontend. Explicit action allowlist only — no eval, no arbitrary function
 * dispatch. Every action except 'health' and 'login' requires a valid
 * shared-code session token, validated here before any service call runs.
 * Deliberately excludes setupSystem/getSystemConfig — owner-only
 * provisioning stays off this public gateway entirely, not just role-gated.
 */

function GatewayError(code, message) {
  this.code = code;
  this.message = message;
}
GatewayError.prototype = Object.create(Error.prototype);

var Gateway = (function() {
  var MAX_REQUEST_BYTES = 2 * 1024 * 1024; // generous for JSON; PDF bytes are separately size-checked in PdfService

  var PUBLIC_ACTIONS = { health: true, login: true };

  var ACTIONS = {
    health: function() {
      return { status: 'ok', time: new Date().toISOString() };
    },
    login: function(payload) {
      var code = payload && payload.accessCode;
      if (!GatewaySession.isAccessCodeConfigured()) {
        throw new GatewayError('CONFIGURATION_ERROR', 'The access code has not been configured yet. Ask the system owner to complete setup.');
      }
      if (!GatewaySession.verifyAccessCode(code)) {
        throw new GatewayError('INVALID_CODE', 'Incorrect access code.');
      }
      var session = GatewaySession.createSession();
      return { sessionToken: session.token, expiresInSeconds: session.expiresInSeconds };
    },
    sessionCheck: function() {
      return { valid: true };
    },
    getBootstrapData: function() {
      return DashboardService.getBootstrapData();
    },
    getDashboard: function(payload) {
      return DashboardService.getDashboardData(payload && payload.filters);
    },
    getVideos: function(payload) {
      return VideoService.getLibraryVideos(payload && payload.filters);
    },
    addProjectVideo: function(payload) {
      return VideoService.addProjectVideo(payload);
    },
    addMarketingContent: function(payload) {
      return VideoService.addMarketingContent(payload);
    },
    addNewVersion: function(payload) {
      return VideoService.addNewVersion(payload);
    },
    getVideoVersionHistory: function(payload) {
      return VideoService.getVideoVersionHistory(payload && payload.videoNumber);
    },
    updateSingleVideoMetadata: function(payload) {
      return VideoService.updateSingleVideoMetadata(
        payload && payload.driveFileId,
        payload && payload.fields,
        payload && payload.confirmRename
      );
    },
    getUnits: function() {
      return UnitService.getUnits();
    },
    getUnitDetail: function(payload) {
      return UnitService.getUnitDetail(payload && payload.unitId);
    },
    createUnit: function(payload) {
      return UnitService.createUnit(payload);
    },
    updateUnit: function(payload) {
      return UnitService.updateUnit(
        payload && payload.unitId,
        payload && payload.fields,
        payload && payload.executeBatchRename
      );
    },
    uploadPdf: function(payload) {
      return PdfService.uploadUnitDesignPdf(payload);
    }
  };

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function withRequestId(response, requestId) {
    response.requestId = requestId;
    return response;
  }

  function classifyActionError(error) {
    if (error instanceof GatewayError) {
      return Utils.errorResponse(error.code, error.message);
    }
    var errMsg = (error && error.message) || String(error);
    var errCode = 'EXECUTION_ERROR';
    if (errMsg.indexOf('not authorized') !== -1 || errMsg.indexOf('Access Denied') !== -1) {
      errCode = 'UNAUTHORIZED';
    } else if (errMsg.indexOf("isn't editable by your Google account") !== -1) {
      errCode = 'PERMISSION_DENIED';
    } else if (errMsg.indexOf('already registered') !== -1 || errMsg.indexOf('duplicate') !== -1) {
      errCode = 'DUPLICATE_FILE';
    } else if (errMsg.indexOf('lock') !== -1) {
      errCode = 'LOCKED';
    }
    AuditService.logFailure('GATEWAY_' + errCode, 'Gateway', '', '', errCode, errMsg);
    return Utils.errorResponse(errCode, errMsg);
  }

  /**
   * @param {string} rawBody - raw POST body text, expected to be JSON:
   *   { requestId, action, sessionToken, payload }
   * @return {Object} plain response object — never a raw thrown error.
   */
  function handleRequest(rawBody) {
    var requestId = '';
    try {
      if (typeof rawBody !== 'string' || rawBody.length === 0) {
        return Utils.errorResponse('BAD_REQUEST', 'Empty request body.');
      }
      if (rawBody.length > MAX_REQUEST_BYTES) {
        return Utils.errorResponse('PAYLOAD_TOO_LARGE', 'Request body exceeds the maximum allowed size.');
      }

      var request;
      try {
        request = JSON.parse(rawBody);
      } catch (parseErr) {
        return Utils.errorResponse('BAD_REQUEST', 'Request body is not valid JSON.');
      }

      if (!isPlainObject(request)) {
        return Utils.errorResponse('BAD_REQUEST', 'Request body must be a JSON object.');
      }

      requestId = (typeof request.requestId === 'string' && request.requestId) ? request.requestId.slice(0, 100) : '';
      var action = request.action;

      if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
        return withRequestId(Utils.errorResponse('UNKNOWN_ACTION', 'Unknown or unsupported action.'), requestId);
      }

      var payload = isPlainObject(request.payload) ? request.payload : {};

      if (!PUBLIC_ACTIONS[action]) {
        var sessionToken = typeof request.sessionToken === 'string' ? request.sessionToken : '';
        if (!GatewaySession.validateSession(sessionToken)) {
          return withRequestId(Utils.errorResponse('SESSION_INVALID', 'Your session has expired or is invalid. Please log in again.'), requestId);
        }
        Auth.markGatewaySessionAuthenticated();
      }

      var data;
      try {
        data = ACTIONS[action](payload);
      } catch (actionErr) {
        return withRequestId(classifyActionError(actionErr), requestId);
      }

      return withRequestId(Utils.successResponse(data), requestId);
    } catch (fatalErr) {
      // Never leak a stack trace or raw error object to the client.
      return withRequestId(Utils.errorResponse('EXECUTION_ERROR', 'An unexpected server error occurred.'), requestId);
    }
  }

  return {
    handleRequest: handleRequest,
    PUBLIC_ACTIONS: PUBLIC_ACTIONS,
    ACTIONS: ACTIONS
  };
})();
