/**
 * Amlaak Video Library — Google Identity Services (GIS) Client
 * Handles token lifecycle, decode, storage and session callbacks (§8, §14)
 */
import { setAuthToken } from '../api/client.js';

const STORAGE_KEY = 'amlaak_id_token';
let currentUser = null;
let onAuthChangedCallback = null;

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
}

export function initGoogleAuth(clientId, onAuthChanged) {
  onAuthChangedCallback = onAuthChanged;

  // (§9) Purge legacy tokens from localStorage - tokens held strictly in memory only
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('amlaak_auth_token');
    localStorage.removeItem('id_token');
  } catch (e) {
    // ignore storage access restrictions
  }

  // Initialize Google Identity Services if loaded
  if (window.google && window.google.accounts && window.google.accounts.id && clientId) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: true
    });
  }
}

export function handleCredentialResponse(response) {
  if (!response || !response.credential) return;

  const idToken = response.credential;
  const claims = parseJwt(idToken);
  if (!claims || !claims.email) {
    console.error('Invalid ID token received from GIS');
    return;
  }

  // Token is kept strictly in memory (§9) - never written to localStorage
  setAuthToken(idToken);

  currentUser = {
    email: claims.email,
    name: claims.name || claims.email.split('@')[0],
    picture: claims.picture || null,
    token: idToken
  };

  if (onAuthChangedCallback) {
    onAuthChangedCallback(currentUser);
  }
}

export function renderSignInButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.renderButton(container, {
      theme: 'filled_black',
      size: 'medium',
      shape: 'pill',
      text: 'signin_with'
    });
  }
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
  setAuthToken(null);
  currentUser = null;
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  if (onAuthChangedCallback) {
    onAuthChangedCallback(null);
  }
}

export function getCurrentUser() {
  return currentUser;
}
