/**
 * Amlaak Video Library — Authentication & Access Control
 * Enforces server-side email allowlist and role-based permissions.
 */

var Auth = (function() {
  var ROLES = {
    OWNER: 'System Owner',
    USER_1: 'Authorised User 1',
    USER_2: 'Authorised User 2',
    EDITOR: 'Editor',
    VIEWER: 'Viewer',
    SHARED_SESSION: 'Shared Access Session'
  };

  // Set only by Gateway.gs, once per request, after it has independently
  // validated a shared-code session token. Under the GitHub Pages gateway's
  // access model (ANYONE_ANONYMOUS / USER_DEPLOYING) there is no accessing
  // Google identity to check — Session.getActiveUser() returns nothing
  // meaningful — so requireAuth()/getCurrentUser() below defer to this flag
  // instead when it has been set. The original Apps Script HTML UI deployment
  // never sets it, so its Google-identity + allowlist behaviour is unchanged.
  var gatewaySessionAuthenticated = false;

  function markGatewaySessionAuthenticated() {
    gatewaySessionAuthenticated = true;
  }

  /**
   * Retrieves the accessing user's email — the sole source of truth for
   * authorisation identity. Session.getEffectiveUser() is deliberately not
   * used as a fallback here: with webapp.executeAs = USER_ACCESSING, the
   * accessing identity must come only from getActiveUser(); a blank result
   * fails closed rather than substituting a different identity.
   */
  function getCurrentUserEmail() {
    var email = '';
    try {
      email = Session.getActiveUser().getEmail();
    } catch (e) {
      // ignore — fails closed to '' below
    }
    return (email || '').trim().toLowerCase();
  }

  /**
   * Diagnostic-only identity, safe to log internally (e.g. audit entries or
   * error messages). Must never be used to grant or check authorisation.
   */
  function getDiagnosticEffectiveEmail() {
    try {
      return (Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
    } catch (e) {
      return '';
    }
  }

  /**
   * Checks whether the given or current user is on the active allowlist.
   */
  function getCurrentUser() {
    if (gatewaySessionAuthenticated) {
      return {
        email: '',
        role: ROLES.SHARED_SESSION,
        active: true,
        isAuthorized: true,
        message: 'Access authorized via shared-code session'
      };
    }

    var email = getCurrentUserEmail();
    if (!email) {
      return {
        email: '',
        role: null,
        active: false,
        isAuthorized: false,
        message: 'No signed-in Google account could be detected (Google session missing).'
      };
    }

    // Check allowlist in Authorised Users sheet
    var sheetUsers = getAllowlistFromSheet();
    var found = null;

    for (var i = 0; i < sheetUsers.length; i++) {
      if (sheetUsers[i].email.toLowerCase() === email) {
        found = sheetUsers[i];
        break;
      }
    }

    if (found && (String(found.active).toUpperCase() === 'YES' || found.active === true || String(found.active).toUpperCase() === 'TRUE')) {
      return {
        email: email,
        role: found.role || ROLES.EDITOR,
        active: true,
        isAuthorized: true,
        message: 'Access authorized'
      };
    }

    // If system is not initialized yet and this user is executing setup, grant bootstrap owner
    var isInit = Config.getProperty(Config.KEYS.SYSTEM_INITIALIZED);
    if (!isInit) {
      return {
        email: email,
        role: ROLES.OWNER,
        active: true,
        isAuthorized: true,
        isBootstrap: true,
        message: 'Initial setup account (Bootstrap Mode)'
      };
    }

    return {
      email: email,
      role: null,
      active: false,
      isAuthorized: false,
      message: 'This account is not on the authorized users list (Access Denied).'
    };
  }

  function requireAuth() {
    var user = getCurrentUser();
    if (!user.isAuthorized) {
      throw new Error('You are not authorized to perform this action. Email: ' + (user.email || 'unknown'));
    }
    return user;
  }

  function requireOwner() {
    var user = requireAuth();
    if (user.role !== ROLES.OWNER) {
      throw new Error('Access Denied: System Owner role required for this action.');
    }
    return user;
  }

  function getAllowlistFromSheet() {
    try {
      var ssId = Config.getProperty(Config.KEYS.SPREADSHEET_ID);
      if (!ssId) return [];
      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName(Config.TABS.USERS);
      if (!sheet) return [];

      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return [];

      var headers = data[0];
      var emailIdx = -1, activeIdx = -1, roleIdx = -1, dateIdx = -1;
      for (var c = 0; c < headers.length; c++) {
        var h = String(headers[c]).trim().toLowerCase();
        if (h === 'email') emailIdx = c;
        else if (h === 'active') activeIdx = c;
        else if (h === 'role') roleIdx = c;
        else if (h.indexOf('date') !== -1) dateIdx = c;
      }

      var list = [];
      for (var r = 1; r < data.length; r++) {
        var rowEmail = emailIdx !== -1 ? String(data[r][emailIdx]).trim() : '';
        if (rowEmail) {
          list.push({
            email: rowEmail,
            active: activeIdx !== -1 ? data[r][activeIdx] : false,
            role: roleIdx !== -1 ? data[r][roleIdx] : ROLES.EDITOR,
            addedDate: dateIdx !== -1 ? data[r][dateIdx] : ''
          });
        }
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  return {
    ROLES: ROLES,
    markGatewaySessionAuthenticated: markGatewaySessionAuthenticated,
    getCurrentUserEmail: getCurrentUserEmail,
    getDiagnosticEffectiveEmail: getDiagnosticEffectiveEmail,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    requireOwner: requireOwner,
    getAllowlistFromSheet: getAllowlistFromSheet
  };
})();
