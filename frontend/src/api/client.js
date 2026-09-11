/**
 * Amlaak Video Library — Zero-Cost Serverless API Client (§14, §15)
 * Connects GitHub Pages directly to Google Apps Script Execution API
 * and Google Drive Resumable Upload API using Google OAuth 2.0 Access Tokens.
 *
 * Architecture:
 * GitHub Pages Frontend → Google OAuth (GIS Access Token) → Apps Script Execution API (scripts.run) → Google Sheets + Google Drive
 *
 * Hard Constraints:
 * - Zero billable services (No Cloud Run, No Firestore, No Service Accounts, No Billing Account).
 * - Tokens stored strictly in memory only (never written to localStorage/sessionStorage).
 * - Hardcoded devMode: false for execution against production script deployment.
 */

let authToken = null;

// Configured Apps Script Executable ID (Amlaak Video Library Engine)
const DEFAULT_APPS_SCRIPT_ID = '1JrzD-iy_FnxXkQLBPiZ5AeZCa7HMIXrnTfxJLzqePGnygZmLCKcYkWjB';

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function getAppsScriptId() {
  if (typeof window !== 'undefined') {
    if (window.ENV_APPS_SCRIPT_ID) return window.ENV_APPS_SCRIPT_ID;
    if (window.ENV_BACKEND_URL && !window.ENV_BACKEND_URL.startsWith('http')) {
      return window.ENV_BACKEND_URL;
    }
  }
  return DEFAULT_APPS_SCRIPT_ID;
}

/**
 * Execute Google Apps Script API function via POST https://script.googleapis.com/v1/scripts/{SCRIPT_ID}:run
 * Enforces devMode: false and returns normalized { ok, data, errorCode, message } payload.
 */
export async function executeAppsScriptApi(fnName, parameters = []) {
  const scriptId = getAppsScriptId();
  if (!scriptId) {
    return {
      ok: false,
      errorCode: 'ERR-CONN-UNAVAILABLE',
      message: 'The application is currently unavailable because the Apps Script Executable ID is not configured.'
    };
  }

  const execUrl = `https://script.googleapis.com/v1/scripts/${encodeURIComponent(scriptId)}:run`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const body = {
    function: fnName,
    parameters: Array.isArray(parameters) ? parameters : (parameters !== undefined ? [parameters] : []),
    devMode: false
  };

  try {
    const res = await fetch(execUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (res.status === 401 || res.status === 403) {
      const errBody = await res.json().catch(() => ({}));
      const msg = (errBody.error && errBody.error.message)
        ? errBody.error.message
        : 'Authentication required. Please sign in with your authorised Google account.';
      return {
        ok: false,
        errorCode: (res.status === 401) ? 'ERR-AUTH-REQUIRED' : 'ERR-ACCESS-DENIED',
        message: msg
      };
    }

    const data = await res.json().catch(() => ({
      error: {
        code: 500,
        message: 'Invalid non-JSON response received from Apps Script Execution API (' + res.status + ')'
      }
    }));

    // Check for Google API level error
    if (data.error) {
      const errDetail = (data.error.details && data.error.details[0] && data.error.details[0].errorMessage)
        ? data.error.details[0].errorMessage
        : data.error.message;
      return {
        ok: false,
        errorCode: data.error.status || 'APPS_SCRIPT_API_ERROR',
        message: errDetail || 'Google Apps Script Execution API returned an error.'
      };
    }

    // Unpack Execution API response
    if (data.response) {
      if (data.response.error) {
        return {
          ok: false,
          errorCode: 'SCRIPT_EXECUTION_ERROR',
          message: data.response.error.message || 'Apps Script execution failed.'
        };
      }

      const scriptResult = data.response.result;
      if (scriptResult && typeof scriptResult === 'object') {
        if (scriptResult.success === true) {
          return {
            ok: true,
            data: scriptResult.data
          };
        } else if (scriptResult.success === false) {
          return {
            ok: false,
            errorCode: (scriptResult.error && scriptResult.error.code) ? scriptResult.error.code : 'EXECUTION_ERROR',
            message: (scriptResult.error && scriptResult.error.message) ? scriptResult.error.message : 'Operation failed.'
          };
        }
      }

      // If raw data returned directly
      return {
        ok: true,
        data: scriptResult
      };
    }

    return {
      ok: false,
      errorCode: 'UNEXPECTED_RESPONSE',
      message: 'Unexpected payload format received from Apps Script Execution API.'
    };
  } catch (err) {
    return {
      ok: false,
      errorCode: 'ERR-CONN-REFUSED',
      message: 'The application is currently unavailable because a secure database connection could not be established: ' + err.message
    };
  }
}

/**
 * Direct Google Drive Resumable Upload (§15)
 * Uploads large PDF files directly from the browser to Google Drive using the short-lived OAuth token.
 * Completely bypasses Apps Script memory / execution limits.
 */
export async function uploadPdfDirectToDrive(file, folderId) {
  if (!authToken) {
    return {
      ok: false,
      errorCode: 'AUTH_REQUIRED',
      message: 'Google authorization token required to upload file directly to Google Drive.'
    };
  }

  try {
    const metadata = {
      name: file.name,
      mimeType: 'application/pdf'
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    // 1. Initiate Resumable Upload Session
    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/pdf',
        'X-Upload-Content-Length': String(file.size)
      },
      body: JSON.stringify(metadata)
    });

    if (!initRes.ok) {
      const errJson = await initRes.json().catch(() => ({}));
      const msg = errJson.error ? errJson.error.message : ('Upload initiation failed with status ' + initRes.status);
      return { ok: false, errorCode: 'DRIVE_INIT_FAILED', message: msg };
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      return { ok: false, errorCode: 'MISSING_UPLOAD_URL', message: 'Google Drive did not return a resumable upload URL.' };
    }

    // 2. Stream / Upload File Bytes to Resumable Session URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(file.size)
      },
      body: file
    });

    if (!uploadRes.ok) {
      return { ok: false, errorCode: 'DRIVE_UPLOAD_FAILED', message: 'Uploading bytes to Google Drive failed (' + uploadRes.status + ')' };
    }

    const driveFileData = await uploadRes.json();
    return {
      ok: true,
      driveFileId: driveFileData.id,
      fileName: driveFileData.name || file.name,
      fileSize: file.size
    };
  } catch (err) {
    return {
      ok: false,
      errorCode: 'DRIVE_NETWORK_ERROR',
      message: 'Direct Google Drive upload failed: ' + err.message
    };
  }
}

/**
 * Universal API Bridge (§14)
 * Bridges UI actions directly with Google Apps Script Execution API.
 */
export function callApi(fnName, args, callback) {
  if (typeof callback !== 'function') {
    callback = () => {};
  }

  const parameters = args || [];

  executeAppsScriptApi(fnName, parameters)
    .then(result => {
      callback(result);
    })
    .catch(err => {
      callback({
        ok: false,
        errorCode: 'DISPATCH_ERROR',
        message: err.message
      });
    });
}
