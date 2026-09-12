/**
 * Amlaak Video Library — Shared-Code Gateway Session Management
 * Used only by the GitHub Pages frontend transport (see Gateway.gs). The
 * existing Google-identity model (Auth.gs) is untouched and still used by
 * the original Apps Script HTML UI deployment, which stays available as a
 * rollback.
 */

var GatewaySession = (function() {
  var SESSION_TTL_SECONDS = 6 * 60 * 60; // CacheService's own maximum TTL

  function sha256Hex(str) {
    var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
    return rawHash.map(function(b) {
      var v = (b < 0) ? b + 256 : b;
      var hex = v.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function constantTimeEquals(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function generateSalt() {
    return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  }

  /**
   * Stores only a salted SHA-256 hash of the access code — never the raw
   * value. Intended to be called only from ONE_TIME_setAccessCode(), run
   * manually by the owner in the Apps Script editor.
   */
  function setAccessCode(rawCode) {
    if (!rawCode || String(rawCode).length < 8) {
      throw new Error('Access code must be at least 8 characters.');
    }
    var salt = generateSalt();
    var hash = sha256Hex(salt + String(rawCode));
    Config.setProperties({
      APP_ACCESS_CODE_SALT: salt,
      APP_ACCESS_CODE_HASH: hash,
      APP_SESSION_EPOCH: String(Date.now())
    });
    return 'Access code configured. Salt and hash stored in Script Properties; the raw code was not logged or saved anywhere.';
  }

  function verifyAccessCode(rawCode) {
    var salt = Config.getProperty(Config.KEYS.APP_ACCESS_CODE_SALT);
    var storedHash = Config.getProperty(Config.KEYS.APP_ACCESS_CODE_HASH);
    if (!salt || !storedHash) return false;
    if (!rawCode || typeof rawCode !== 'string') return false;
    return constantTimeEquals(sha256Hex(salt + rawCode), storedHash);
  }

  function isAccessCodeConfigured() {
    return !!(Config.getProperty(Config.KEYS.APP_ACCESS_CODE_SALT) && Config.getProperty(Config.KEYS.APP_ACCESS_CODE_HASH));
  }

  function createSession() {
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var tokenHash = sha256Hex(token);
    var epoch = Config.getProperty(Config.KEYS.APP_SESSION_EPOCH, '0');
    CacheService.getScriptCache().put('gwsession_' + tokenHash, JSON.stringify({ epoch: epoch }), SESSION_TTL_SECONDS);
    return { token: token, expiresInSeconds: SESSION_TTL_SECONDS };
  }

  function validateSession(token) {
    if (!token || typeof token !== 'string') return false;
    var raw = CacheService.getScriptCache().get('gwsession_' + sha256Hex(token));
    if (!raw) return false;
    try {
      var record = JSON.parse(raw);
      return record.epoch === Config.getProperty(Config.KEYS.APP_SESSION_EPOCH, '0');
    } catch (e) {
      return false;
    }
  }

  function invalidateSession(token) {
    if (!token || typeof token !== 'string') return;
    CacheService.getScriptCache().remove('gwsession_' + sha256Hex(token));
  }

  function bumpSessionEpoch() {
    Config.setProperty(Config.KEYS.APP_SESSION_EPOCH, String(Date.now()));
  }

  return {
    sha256Hex: sha256Hex,
    constantTimeEquals: constantTimeEquals,
    setAccessCode: setAccessCode,
    verifyAccessCode: verifyAccessCode,
    isAccessCodeConfigured: isAccessCodeConfigured,
    createSession: createSession,
    validateSession: validateSession,
    invalidateSession: invalidateSession,
    bumpSessionEpoch: bumpSessionEpoch
  };
})();

/**
 * ONE-TIME SETUP — run this yourself from the Apps Script editor (Run menu
 * -> select ONE_TIME_setAccessCode -> Run). Never call this through the
 * gateway, and never commit a real access code to git.
 *
 * 1. Replace 'CHANGE_ME' below with your chosen access code (8+ characters
 *    — something you can share securely with staff, not a password you
 *    reuse elsewhere).
 * 2. Save (Ctrl+S) and Run this function once, here in the editor.
 * 3. Confirm success in the execution log (it will not show the raw code).
 * 4. Immediately change the line back to 'CHANGE_ME' and save again — the
 *    raw value must not remain in source once it has been applied.
 */
function ONE_TIME_setAccessCode() {
  var rawCode = 'CHANGE_ME';
  if (rawCode === 'CHANGE_ME') {
    throw new Error('Edit ONE_TIME_setAccessCode() in the Apps Script editor and replace CHANGE_ME with your chosen access code before running it.');
  }
  Logger.log(GatewaySession.setAccessCode(rawCode));
}

/**
 * Emergency revocation — run from the editor to instantly invalidate every
 * currently-issued session (e.g. if the access code may have leaked),
 * without needing to change the code itself.
 */
function ONE_TIME_revokeAllSessions() {
  GatewaySession.bumpSessionEpoch();
  Logger.log('All existing sessions invalidated. Users must log in again with the current access code.');
}
