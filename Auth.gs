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
    VIEWER: 'Viewer'
  };

  /**
   * Retrieves the currently active user email.
   * Handles Google Workspace and personal Gmail sessions.
   */
  function getCurrentUserEmail() {
    var email = '';
    try {
      email = Session.getActiveUser().getEmail();
    } catch (e) {
      // ignore
    }
    if (!email) {
      try {
        email = Session.getEffectiveUser().getEmail();
      } catch (e2) {
        // ignore
      }
    }
    return (email || '').trim().toLowerCase();
  }

  /**
   * Checks whether the given or current user is on the active allowlist.
   */
  function getCurrentUser() {
    var email = getCurrentUserEmail();
    if (!email) {
      return {
        email: '',
        role: null,
        active: false,
        isAuthorized: false,
        message: 'لم يتم التعرف على حساب Google المسجل به (Google Session missing).'
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
        message: 'مصرّح له بالوصول'
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
        message: 'حساب التهيئة الأولي (Bootstrap Mode)'
      };
    }

    return {
      email: email,
      role: null,
      active: false,
      isAuthorized: false,
      message: 'الحساب غير مدرج في قائمة المستخدمين المصرح لهم (Access Denied).'
    };
  }

  function requireAuth() {
    var user = getCurrentUser();
    if (!user.isAuthorized) {
      throw new Error('غير مصرح لك بتنفيذ هذه العملية. البريد الإلكتروني: ' + (user.email || 'مجهول'));
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
    getCurrentUserEmail: getCurrentUserEmail,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    requireOwner: requireOwner,
    getAllowlistFromSheet: getAllowlistFromSheet
  };
})();
