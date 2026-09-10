/**
 * Amlaak Video Library — REST API Client & Dispatcher
 * Bridges UI actions with Google Cloud Run REST API (§14)
 */

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function getBackendBaseUrl() {
  if (typeof window !== 'undefined' && window.ENV_BACKEND_URL) {
    return window.ENV_BACKEND_URL;
  }
  return 'https://amlaak-video-backend-preview.run.app/api/v1';
}

export async function callRest(endpoint, method = 'GET', payload = null, queryParams = null) {
  const base = getBackendBaseUrl().replace(/\/+$/, '');
  let fetchUrl = `${base}/${endpoint.replace(/^\//, '')}`;

  if (queryParams) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        sp.append(k, String(v));
      }
    }
    const qStr = sp.toString();
    if (qStr) fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + qStr;
  }

  const headers = {
    'Accept': 'application/json'
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method: method.toUpperCase(),
    headers
  };

  if (payload && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload);
  }

  try {
    const res = await fetch(fetchUrl, options);
    const data = await res.json().catch(() => ({
      ok: false,
      errorCode: 'INVALID_JSON',
      message: 'Server returned non-JSON response (' + res.status + ')'
    }));

    if (res.status === 401 || res.status === 403) {
      console.warn('Authentication / Authorisation error:', data);
    }
    return data;
  } catch (err) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: 'Backend network communication failed: ' + err.message
    };
  }
}

/**
 * Universal Legacy Bridge (§14)
 * Allows existing UI handlers calling callApi(fnName, args, callback)
 * to seamlessly route through REST or Mock Dispatcher.
 */
export function callApi(fnName, args, callback) {
  if (typeof callback !== 'function') {
    callback = () => {};
  }

  // Standalone offline review fallback
  if (typeof window !== 'undefined' && window._localMockDispatcher && (window.FORCE_LOCAL_MOCKS || !authToken)) {
    window._localMockDispatcher(fnName, args, callback);
    return;
  }

  const a = args || [];

  (async () => {
    let result = null;
    switch (fnName) {
      case 'apiGetAppBootstrapData':
        result = await callRest('bootstrap', 'GET');
        break;
      case 'apiGetDashboard':
        result = await callRest('dashboard', 'GET', null, a[0]);
        break;
      case 'apiCreateUnit':
        result = await callRest('units', 'POST', a[0]);
        break;
      case 'apiAddProjectVideo':
        result = await callRest('videos/project', 'POST', a[0]);
        break;
      case 'apiAddMarketingContent':
        result = await callRest('videos/marketing', 'POST', a[0]);
        break;
      case 'apiGetVideos':
        result = await callRest('videos', 'GET', null, a[0]);
        break;
      case 'apiGetVideoVersionHistory':
        result = await callRest(`videos/${encodeURIComponent(a[0])}/versions`, 'GET');
        break;
      case 'apiUpdateSingleVideoMetadata':
        result = await callRest(`videos/${encodeURIComponent(a[0])}/metadata`, 'PATCH', {
          fields: a[1],
          confirmRename: a[2]
        });
        break;
      case 'apiAddNewVersion':
        result = await callRest('videos/version', 'POST', a[0]);
        break;
      case 'apiGetUnits':
        result = await callRest('units', 'GET');
        break;
      case 'apiGetUnitDetail':
        result = await callRest(`units/${encodeURIComponent(a[0])}`, 'GET');
        break;
      case 'apiUpdateUnit':
        result = await callRest(`units/${encodeURIComponent(a[0])}`, 'PATCH', {
          fields: a[1],
          executeBatchRename: a[2]
        });
        break;
      case 'apiUploadPdf':
        result = await callRest('pdfs', 'POST', a[0]);
        break;
      case 'apiGetSystemConfig':
        result = await callRest('config', 'GET');
        break;
      case 'apiSetupSystem':
        result = await callRest('config/setup', 'POST', a[0]);
        break;
      default:
        result = {
          ok: false,
          errorCode: 'UNKNOWN_ENDPOINT',
          message: 'Unknown API function: ' + fnName
        };
    }
    callback(result);
  })().catch(err => {
    callback({
      ok: false,
      errorCode: 'DISPATCH_ERROR',
      message: err.message
    });
  });
}
