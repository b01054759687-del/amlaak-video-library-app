/**
 * Amlaak Video Library — Google Identity Services (GIS) OAuth 2.0 Token Client
 * Manages OAuth 2.0 access tokens for Apps Script Execution API and Google Drive (§8, §14)
 *
 * Scopes:
 * - https://www.googleapis.com/auth/spreadsheets
 * - https://www.googleapis.com/auth/drive
 * - https://www.googleapis.com/auth/userinfo.email
 * - https://www.googleapis.com/auth/script.scriptapp
 *
 * Security Standard (§9):
 * - Tokens are strictly held in memory only.
 * - Zero localStorage or sessionStorage writes.
 */
import { setAuthToken } from '../api/client.js';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/script.scriptapp'
].join(' ');

let tokenClient = null;
let currentAccessToken = null;
let tokenExpiresAt = 0;
let currentUser = null;
let onAuthChangedCallback = null;

export function initGoogleAuth(clientId, onAuthChanged) {
  onAuthChangedCallback = onAuthChanged;

  // (§9) Purge legacy tokens from localStorage - tokens held strictly in memory only
  try {
    localStorage.removeItem('amlaak_id_token');
    localStorage.removeItem('amlaak_auth_token');
    localStorage.removeItem('amlaak_access_token');
    localStorage.removeItem('id_token');
  } catch (e) {
    // Ignore storage restrictions
  }

  if (typeof window === 'undefined') return;

  function tryInitClient() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2 && clientId) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: handleTokenResponse
      });
      return true;
    }
    return false;
  }

  if (!tryInitClient()) {
    // Retry shortly if GIS script is loading asynchronously
    const timer = setInterval(() => {
      if (tryInitClient()) {
        clearInterval(timer);
      }
    }, 100);
    setTimeout(() => clearInterval(timer), 5000);
  }
}

export function handleTokenResponse(tokenResponse) {
  if (!tokenResponse) return;

  if (tokenResponse.error) {
    console.warn('GIS Token acquisition error:', tokenResponse.error);
    return;
  }

  if (tokenResponse.access_token) {
    currentAccessToken = tokenResponse.access_token;
    setAuthToken(currentAccessToken);
    const expiresInSec = parseInt(tokenResponse.expires_in, 10) || 3600;
    tokenExpiresAt = Date.now() + expiresInSec * 1000;

    // Fetch user profile info using the acquired access token
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': 'Bearer ' + currentAccessToken
      }
    })
      .then(res => res.json())
      .then(userInfo => {
        currentUser = {
          email: userInfo.email || '',
          name: userInfo.name || (userInfo.email ? userInfo.email.split('@')[0] : 'Authorised User'),
          picture: userInfo.picture || null,
          token: currentAccessToken
        };
        if (onAuthChangedCallback) {
          onAuthChangedCallback(currentUser);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch user profile info:', err);
        currentUser = {
          email: '',
          name: 'Authorised User',
          picture: null,
          token: currentAccessToken
        };
        if (onAuthChangedCallback) {
          onAuthChangedCallback(currentUser);
        }
      });
  }
}

export function requestGoogleSignIn(optPrompt) {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: optPrompt !== undefined ? optPrompt : '' });
  } else {
    console.info('Token client not ready yet. Please ensure Google Identity script is loaded.');
  }
}

export function renderSignInButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <button type="button" id="btnGsiCustomSignIn" class="px-5 py-2.5 rounded-full bg-slate-900 text-white border border-slate-700 hover:border-[#DFBF7A] hover:text-[#DFBF7A] transition flex items-center gap-3 font-semibold text-xs shadow-lg mx-auto">
      <svg class="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Sign in with Google</span>
    </button>
  `;

  const btn = document.getElementById('btnGsiCustomSignIn');
  if (btn) {
    btn.onclick = () => requestGoogleSignIn();
  }
}

export function signOut() {
  try {
    localStorage.removeItem('amlaak_id_token');
    localStorage.removeItem('amlaak_auth_token');
    localStorage.removeItem('amlaak_access_token');
    localStorage.removeItem('id_token');
  } catch (e) {
    // Ignore
  }

  if (currentAccessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(currentAccessToken, () => {});
    } catch (e) {
      // Ignore revoke errors
    }
  }

  currentAccessToken = null;
  tokenExpiresAt = 0;
  currentUser = null;
  setAuthToken(null);

  if (onAuthChangedCallback) {
    onAuthChangedCallback(null);
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function getAccessToken() {
  if (tokenExpiresAt && Date.now() > tokenExpiresAt) {
    return null;
  }
  return currentAccessToken;
}
