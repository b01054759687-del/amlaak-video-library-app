
/**
 * Amlaak Video Library — Client Application Engine (Production Module)
 * Integrated with Secure REST API and Google Identity Services
 */
import { setAuthToken, getAuthToken, getAppsScriptId, executeAppsScriptApi, uploadPdfDirectToDrive, callApi } from './api/client.js';
import { initGoogleAuth, signOut, getCurrentUser, renderSignInButton, requestGoogleSignIn } from './auth/google-auth.js';

// Configuration: can be overridden via window.ENV_BACKEND_URL or window.ENV_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID = window.ENV_GOOGLE_CLIENT_ID || '742218533519-6j44d9d2sscgq84p8akenma8ea8m85u8.apps.googleusercontent.com';

/**
 * Amlaak Video Library — Client Application Engine.
 * Orchestrates UI state, async REST API calls, validation, and live filename previews.
 * Connects exclusively to authenticated backend API without mocks in production.
 */

var AppState = {
  currentUser: null,
  isConfigured: false,
  lists: {
    videoSource: [],
    unitType: [],
    projectVideoType: [],
    spaceType: [],
    marketingContentType: [],
    workCategory: [],
    locations: []
  },
  allUnits: [],
  allVideos: [],
  currentTab: 'dashboard',
  selectedAddSource: 'Project Video',
  activeUnitDetail: null,
  activeVideoForVersion: null,
  pendingBatchRename: null,
  editingVideoRecord: null,
  debounceTimer: null,
  // Sequence counters for asynchronous race condition protection (§9)
  searchRequestId: 0,
  dashboardRequestId: 0,
  unitsRequestId: 0,
  // Controlled pagination state (§6)
  libraryPage: 1,
  libraryPageSize: 25,
  libraryTotalPages: 1
};

// =============================================================
// ACCESSIBLE MODAL MANAGEMENT (ESC, FOCUS TRAP, ARIA)
// =============================================================
var activeModalElement = null;
var previousFocusedElement = null;

function openModal(modalId) {
  var modal = document.getElementById(modalId);
  if (!modal) return;
  previousFocusedElement = document.activeElement;
  activeModalElement = modal;
  modal.classList.remove('hidden');

  var focusable = modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (focusable && focusable.length > 0) {
    setTimeout(function() { focusable[0].focus(); }, 40);
  }
}

function closeModal(modalId) {
  var modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  if (activeModalElement === modal) {
    activeModalElement = null;
  }
  if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
    previousFocusedElement.focus();
    previousFocusedElement = null;
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && activeModalElement) {
    var id = activeModalElement.id;
    if (id === 'modalNewUnit') closeNewUnitModal();
    else if (id === 'modalEditVideoMetadata') closeEditVideoMetadataModal();
    else if (id === 'modalVideoPreview') closeVideoPreviewModal();
    else if (id === 'modalAddVersion') closeAddVersionModal();
    else if (id === 'modalVersionHistory') closeVersionHistoryModal();
    else if (id === 'modalUnitDetail') closeUnitDetailModal();
    else if (id === 'modalBatchRename') cancelBatchRename();
    else if (id === 'modalUploadPdf') closeUploadPdfModal();
    return;
  }

  if (e.key === 'Tab' && activeModalElement) {
    var focusables = activeModalElement.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusables && focusables.length > 0) {
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }
});

// =============================================================
// INITIALISATION & LIFECYCLE
// =============================================================
document.addEventListener('DOMContentLoaded', function() {
  initApp();
});

var isBootstrapping = false;

function renderUnavailableDatabaseState(errorCode, message) {
  var code = errorCode || 'ERR-CONN-UNAVAILABLE';
  var banner = document.getElementById('dbUnavailableBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'dbUnavailableBanner';
    banner.className = 'gold-card p-4 sm:p-5 border-rose-500/40 bg-rose-950/30 text-slate-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4';
    banner.setAttribute('role', 'alert');
    var mainContainer = document.getElementById('mainContent') || document.querySelector('main') || document.body;
    if (mainContainer && mainContainer.firstChild) {
      mainContainer.insertBefore(banner, mainContainer.firstChild);
    }
  }

  banner.innerHTML =
    '<div class="flex items-start gap-3.5">' +
      '<div class="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-lg shrink-0">' +
        '<i class="fa-solid fa-triangle-exclamation"></i>' +
      '</div>' +
      '<div>' +
        '<div class="text-sm font-bold text-white mb-1">Database Connection Unavailable</div>' +
        '<div class="text-xs text-rose-200/90 leading-relaxed font-medium">' +
          'The application is currently unavailable because a secure database connection could not be established.' +
        '</div>' +
        '<details class="text-[11px] font-mono-code text-rose-300/80 mt-1 cursor-pointer">' +
          '<summary class="hover:underline font-bold text-rose-200">Database Connection Unavailable &bull; Technical details</summary>' +
          '<div class="mt-1.5 p-2 bg-rose-950/60 rounded border border-rose-800/40">' +
            'Correlation Code: <span class="font-bold text-white">' + escapeHtml(code) + '</span>' +
            (message ? ' &bull; ' + escapeHtml(message) : '') +
          '</div>' +
        '</details>' +
      '</div>' +
    '</div>' +
    '<div class="shrink-0 flex items-center gap-2">' +
      '<button type="button" onclick="initApp()" class="secondary-btn text-xs font-bold border-rose-500/40 hover:bg-rose-900/40 hover:text-white px-4 py-2.5 min-h-[40px]">' +
        '<i class="fa-solid fa-arrows-rotate"></i> <span>Retry Connection</span>' +
      '</button>' +
    '</div>';

  banner.classList.remove('hidden');

  var statusInd = document.getElementById('connectionStatusIndicator');
  if (statusInd) {
    statusInd.className = 'text-xs text-rose-400 font-semibold flex items-center gap-1.5';
    statusInd.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-400"></i> <span>Database Offline</span>';
  }
  var statusBadge = document.getElementById('configStatusBadge');
  if (statusBadge) {
    statusBadge.textContent = 'Disconnected';
    statusBadge.className = 'font-bold text-rose-400';
  }

  // Zero state for all KPIs (§4)
  var kpiIds = ['kpiLogicalVideos', 'kpiStoredVersions', 'kpiProjectVideos', 'kpiMarketingContent', 'kpiUnits', 'kpiStoredPdfs'];
  kpiIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '0';
  });

  // Empty table states (§4)
  var libTbody = document.getElementById('libraryTableBody');
  if (libTbody) {
    libTbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-xs text-slate-400 font-medium">No records found. Secure database connection required.</td></tr>';
  }
  var unitsContainer = document.getElementById('unitsCatalogContainer');
  if (unitsContainer) {
    unitsContainer.innerHTML = '<div class="col-span-full p-8 text-center text-xs text-slate-400 font-medium bg-slate-900/40 rounded-xl border border-slate-800">No records found. Secure database connection required.</div>';
  }

  // Breakdown & chart containers offline state (§17)
  var breakdownIds = ['chartLocationsList', 'chartStagesList', 'chartSpacesList', 'chartWorkCatList', 'dashRecentActivityList'];
  breakdownIds.forEach(function(bId) {
    var bEl = document.getElementById(bId);
    if (bEl) {
      bEl.innerHTML = '<div class="text-xs text-slate-500 text-center py-4">No data available while the database is offline.</div>';
    }
  });

  // Disable all creation & edit forms (§4)
  var buttonsToDisable = [
    'btnSubmitProjectVideo',
    'btnSubmitMarketingContent',
    'btnSaveUnit',
    'btnSubmitUploadPdf',
    'btnSubmitNewUnit',
    'btnSubmitEditMeta',
    'btnSubmitAddVersion'
  ];
  buttonsToDisable.forEach(function(btnId) {
    var btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      btn.setAttribute('title', 'Database connection unavailable');
    }
  });
}

function clearUnavailableDatabaseState() {
  var banner = document.getElementById('dbUnavailableBanner');
  if (banner) banner.classList.add('hidden');

  var statusInd = document.getElementById('connectionStatusIndicator');
  if (statusInd) {
    statusInd.className = 'text-xs text-amber-300/80 font-semibold flex items-center gap-1.5';
    statusInd.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>Live data from Google Sheets</span>';
  }

  var buttonsToEnable = [
    'btnSubmitProjectVideo',
    'btnSubmitMarketingContent',
    'btnSaveUnit',
    'btnSubmitUploadPdf',
    'btnSubmitNewUnit',
    'btnSubmitEditMeta',
    'btnSubmitAddVersion'
  ];
  buttonsToEnable.forEach(function(btnId) {
    var btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
      btn.removeAttribute('title');
    }
  });
}

function initApp() {
  if (isBootstrapping) return;
  isBootstrapping = true;

  showGlobalLoading('Connecting to Amlaak Video Library API…');

  if (!getAuthToken()) {
    var authModal = document.getElementById('authModal');
    if (GOOGLE_CLIENT_ID) {
      console.info('Awaiting Google Identity authentication...');
      if (authModal) authModal.classList.remove('hidden');
      renderSignInButton('gsiModalButtonContainer');
    } else {
      console.info('Awaiting Google Client ID configuration...');
      if (authModal) {
        authModal.classList.remove('hidden');
        var setupBox = document.getElementById('clientSetupContainer');
        if (setupBox) setupBox.classList.remove('hidden');
      }
    }
    isBootstrapping = false;
    hideGlobalLoading();
    return;
  }

  callApi('apiGetAppBootstrapData', [], function(response) {
    hideGlobalLoading();
    isBootstrapping = false;

    if (!response.ok) {
      console.warn('Bootstrap failed:', response.errorCode, response.message);
      renderUnavailableDatabaseState(response.errorCode, response.message);
      showToast('error', response.message || 'Database connection could not be established.');
      return;
    }

    clearUnavailableDatabaseState();
    AppState.isBootstrapped = true;
    var data = response.data;
    AppState.currentUser = data.user;
    AppState.lists = data.lists;
    AppState.isConfigured = data.isConfigured;
    AppState.unitLookups = data.unitLookups || [];

    var emailBadge = document.getElementById('userEmailBadge');
    var roleBadge = document.getElementById('userRoleBadge');
    if (data.user && data.user.email) {
      emailBadge.textContent = data.user.email;
      roleBadge.textContent = data.user.role || 'Authorised';
      document.getElementById('bannerExecuteEmail').textContent = data.user.email;

      // Settings protection (§11): strictly hide Settings nav for non-owner
      var btnSettings = document.getElementById('btnTabSettings');
      if (btnSettings) {
        if (data.user.role !== 'System Owner') {
          btnSettings.classList.add('hidden');
        } else {
          btnSettings.classList.remove('hidden');
        }
      }
    } else {
      emailBadge.textContent = 'Not signed in';
      roleBadge.textContent = 'Not authorised';
    }

    // Connection badge derived strictly from verified server response
    var statusBadge = document.getElementById('configStatusBadge');
    if (statusBadge) {
      if (data.isConfigured) {
        statusBadge.textContent = 'Connected';
        statusBadge.className = 'font-bold text-emerald-400';
      } else {
        statusBadge.textContent = 'Configuration Needed';
        statusBadge.className = 'font-bold text-amber-400';
      }
    }

    populateTaxonomyDropdowns();

    // Render dashboard immediately with zero extra network round-trips
    if (data.dashboard) {
      renderDashboardData(data.dashboard);
      AppState.dashboardLoaded = true;
    }
  });
}

function reloadCurrentView() {
  var icon = document.getElementById('syncIcon');
  if (icon) icon.classList.add('fa-spin');

  if (AppState.currentTab === 'dashboard') {
    loadDashboard(function() { if (icon) icon.classList.remove('fa-spin'); });
  } else if (AppState.currentTab === 'library') {
    loadLibrary(function() { if (icon) icon.classList.remove('fa-spin'); });
  } else if (AppState.currentTab === 'units') {
    loadUnitsCatalog(function() { if (icon) icon.classList.remove('fa-spin'); });
  } else if (AppState.currentTab === 'settings') {
    loadSettings(function() { if (icon) icon.classList.remove('fa-spin'); });
  } else {
    if (icon) icon.classList.remove('fa-spin');
  }
}

// =============================================================
// NAVIGATION
// =============================================================
function switchTab(tabId) {
  // Enforce Owner role check before navigating to settings (§11)
  if (tabId === 'settings' && AppState.currentUser && AppState.currentUser.role !== 'System Owner') {
    showToast('error', 'Access Denied: System Settings are restricted to the System Owner.');
    switchTab('dashboard');
    return;
  }

  AppState.currentTab = tabId;

  var tabs = ['dashboard', 'addVideo', 'library', 'units', 'settings'];
  tabs.forEach(function(t) {
    var view = document.getElementById('view' + capitalizeFirst(t));
    var btn = document.getElementById('btnTab' + capitalizeFirst(t));
    if (view && btn) {
      if (t === tabId) {
        view.classList.remove('hidden');
        btn.classList.add('active');
      } else {
        view.classList.add('hidden');
        btn.classList.remove('active');
      }
    }
  });

  if (tabId === 'dashboard') loadDashboard();
  else if (tabId === 'library') loadLibrary();
  else if (tabId === 'units') loadUnitsCatalog();
  else if (tabId === 'settings') loadSettings();
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================================
// TAXONOMY DROPDOWNS
// =============================================================
function populateTaxonomyDropdowns() {
  var lists = AppState.lists;

  function fillSelect(selectId, items, defaultText) {
    var el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = '';
    if (defaultText) {
      var defOpt = document.createElement('option');
      defOpt.value = '';
      defOpt.textContent = defaultText;
      el.appendChild(defOpt);
    }
    (items || []).forEach(function(item) {
      var opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
  }

  fillSelect('pvUnitType', lists.unitType, '— Select unit type —');
  fillSelect('pvProjectVideoType', lists.projectVideoType, '— Select video type —');
  fillSelect('pvSpaceType', lists.spaceType, '— Select space type —');
  fillSelect('pvWorkCategory', lists.workCategory, '— Select work category —');

  fillSelect('mcContentType', lists.marketingContentType, '— Select content type —');
  fillSelect('mcSpaceType', lists.spaceType, '— General / not specified —');

  // Video Library filters
  fillSelect('filterStage', lists.projectVideoType, 'All stages');
  fillSelect('filterSpace', lists.spaceType, 'All spaces');
  fillSelect('filterWorkCat', lists.workCategory, 'All categories');
  fillSelect('filterLocation', lists.locations, 'All locations');
  fillSelect('filterContentType', lists.marketingContentType, 'All marketing types');
  fillSelect('filterUnitType', lists.unitType, 'All unit types');

  // Modals selects
  fillSelect('nuUnitType', lists.unitType, '— Select unit type —');
  fillSelect('ueUnitType', lists.unitType);

  // Edit Video Metadata modal selects
  fillSelect('emSpaceType', lists.spaceType, '— Select space type —');
  fillSelect('emWorkCategory', lists.workCategory, '— Select work category —');
  fillSelect('emContentType', lists.marketingContentType, '— Select content type —');
  fillSelect('emMarketingSpaceType', lists.spaceType, '— General / not specified —');
}

function populateSelect(selectId, items, selectedVal) {
  var el = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = '';
  (items || []).forEach(function(item) {
    var opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    if (selectedVal && item === selectedVal) opt.selected = true;
    el.appendChild(opt);
  });
}

// =============================================================
// DASHBOARD
// =============================================================
function loadDashboard(callback) {
  var thisRequestId = ++AppState.dashboardRequestId;

  var filters = {
    dateFilterType: document.getElementById('dashDateType').value,
    startDate: document.getElementById('dashStartDate').value,
    endDate: document.getElementById('dashEndDate').value
  };

  callApi('apiGetDashboard', [filters], function(res) {
    if (thisRequestId !== AppState.dashboardRequestId) return; // Stale discard (§9)
    if (callback) callback();
    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    renderDashboardData(res.data);
    AppState.dashboardLoaded = true;
  });
}

function renderDashboardData(data) {
  if (!data) return;
  var kpis = data.kpis || {};
  var breakdowns = data.breakdowns || {};

  document.getElementById('kpiLogicalVideos').textContent = kpis.totalLogicalVideos || 0;
  document.getElementById('kpiStoredVersions').textContent = kpis.totalStoredVersions || 0;
  document.getElementById('kpiProjectVideos').textContent = kpis.totalProjectVideos || 0;
  document.getElementById('kpiProjectVersionsSub').textContent = (kpis.projectVersionsCount || 0) + ' versions recorded';
  document.getElementById('kpiMarketingVideos').textContent = kpis.totalMarketingContent || 0;
  document.getElementById('kpiMarketingVersionsSub').textContent = (kpis.marketingVersionsCount || 0) + ' versions recorded';
  document.getElementById('kpiTotalUnits').textContent = kpis.totalUnits || 0;
  document.getElementById('kpiStoredPdfs').textContent = kpis.totalStoredPdfs || 0;

  renderBreakdownList('chartLocationsList', breakdowns.locations, 'fa-location-dot', 'text-[#DFBF7A]');
  renderBreakdownList('chartStagesList', breakdowns.stages, 'fa-layer-group', 'text-blue-400');
  renderBreakdownList('chartSpacesList', breakdowns.spaces, 'fa-vector-square', 'text-emerald-400');
  renderBreakdownList('chartWorkCatList', breakdowns.workCategories, 'fa-trowel-bricks', 'text-amber-400');

  var actContainer = document.getElementById('dashRecentActivityList');
  actContainer.innerHTML = '';
  if (!data.recentActivity || data.recentActivity.length === 0) {
    actContainer.innerHTML = '<div class="text-xs text-slate-500 text-center py-3">No activity recorded yet.</div>';
  } else {
    data.recentActivity.forEach(function(act) {
      var row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 rounded-xl bg-[#081120] border border-slate-800 text-xs';
      row.innerHTML =
        '<div class="flex items-center gap-2.5">' +
          '<span class="w-2 h-2 rounded-full bg-emerald-400"></span>' +
          '<div>' +
            '<span class="font-bold text-white">' + escapeHtml(act.message || act.action) + '</span>' +
            '<div class="text-[10px] text-slate-400 mt-0.5">' + escapeHtml(act.user) + ' &bull; <span class="font-num">' + escapeHtml(act.timestamp) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<span class="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-[#DFBF7A]">' + escapeHtml(act.action) + '</span>';
      actContainer.appendChild(row);
    });
  }
}

/**
 * Ranked bar list for one-series magnitude data (dataviz: sequential,
 * single hue, thin rounded marks). Kept intentionally simple — no external
 * charting library is loaded so the Apps Script HtmlService payload stays small.
 */
function renderBreakdownList(containerId, items, iconClass, colorClass) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-500 text-center py-3">No data available.</div>';
    return;
  }

  var maxCount = items[0].count || 1;

  items.forEach(function(item) {
    var pct = Math.max(4, Math.round((item.count / maxCount) * 100));
    var row = document.createElement('div');
    row.className = 'rank-row space-y-1';
    row.title = item.name + ': ' + item.count;
    row.innerHTML =
      '<div class="flex items-center justify-between text-xs">' +
        '<span class="text-slate-200 font-semibold truncate flex items-center gap-1.5">' +
          '<i class="fa-solid ' + iconClass + ' ' + colorClass + ' text-[10px]"></i> ' + escapeHtml(item.name) +
        '</span>' +
        '<span class="font-num font-bold text-white text-[11px]">' + item.count + '</span>' +
      '</div>' +
      '<div class="rank-track"><div class="rank-fill" style="width: ' + pct + '%"></div></div>';
    container.appendChild(row);
  });
}

function clearDashboardDates() {
  document.getElementById('dashStartDate').value = '';
  document.getElementById('dashEndDate').value = '';
  loadDashboard();
}

// =============================================================
// ADD VIDEO
// =============================================================
function setAddSource(source) {
  AppState.selectedAddSource = source;
  var btnProj = document.getElementById('btnSourceProject');
  var btnMkt = document.getElementById('btnSourceMarketing');
  var formProj = document.getElementById('formProjectVideo');
  var formMkt = document.getElementById('formMarketingContent');

  if (source === 'Project Video') {
    btnProj.className = 'flex-1 py-3 rounded-lg font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 toggle-btn-active';
    btnProj.setAttribute('aria-selected', 'true');
    btnMkt.className = 'flex-1 py-3 rounded-lg font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 toggle-btn-inactive';
    btnMkt.setAttribute('aria-selected', 'false');
    formProj.classList.remove('hidden');
    formMkt.classList.add('hidden');
  } else {
    btnMkt.className = 'flex-1 py-3 rounded-lg font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 toggle-btn-active';
    btnMkt.setAttribute('aria-selected', 'true');
    btnProj.className = 'flex-1 py-3 rounded-lg font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 toggle-btn-inactive';
    btnProj.setAttribute('aria-selected', 'false');
    formMkt.classList.remove('hidden');
    formProj.classList.add('hidden');
    var wCat = document.getElementById('pvWorkCategory');
    if (wCat) wCat.value = '';
  }
}

// =============================================================
// NEW UNIT MODAL WORKFLOW (§1)
// =============================================================
function openNewUnitModal() {
  var form = document.getElementById('formNewUnit');
  if (form) form.reset();
  var resBox = document.getElementById('nuLocationResults');
  if (resBox) resBox.classList.add('hidden');
  openModal('modalNewUnit');
  var firstInput = document.getElementById('nuClientName');
  if (firstInput) firstInput.focus();
}

function closeNewUnitModal() {
  closeModal('modalNewUnit');
}

function submitNewUnit(e) {
  e.preventDefault();
  var clientName = document.getElementById('nuClientName').value.trim();
  var location = document.getElementById('nuLocation').value.trim();
  var unitType = document.getElementById('nuUnitType').value;
  var areaVal = document.getElementById('nuArea').value;

  if (!clientName) {
    showToast('error', 'Client name is required.');
    return;
  }
  if (!location) {
    showToast('error', 'Location is required.');
    return;
  }
  if (!unitType) {
    showToast('error', 'Unit type is required.');
    return;
  }

  var btn = document.getElementById('btnSubmitNewUnit');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Creating…';

  var payload = {
    clientName: clientName,
    location: location,
    unitType: unitType,
    area: areaVal ? parseFloat(areaVal) : ''
  };

  callApi('apiCreateUnit', [payload], function(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Create Unit</span>';

    if (!res.ok) {
      showToast('error', res.message || 'Failed to create unit.');
      // Keep form values preserved on failure (§1)
      return;
    }

    var newUnit = res.data;
    showToast('success', 'Unit created: ' + newUnit.clientName + ' (' + newUnit.unitId + ')');
    closeNewUnitModal();

    // Reload catalogue & unit lookups
    loadUnitsCatalog();
    callApi('apiGetAppBootstrapData', [], function(bRes) {
      if (bRes.ok && bRes.data) {
        AppState.unitLookups = bRes.data.unitLookups || bRes.data.units || [];
      }
    });

    // Auto-select in Add Project Video if currently in existing unit mode
    var isExistingMode = document.getElementById('unitModeExisting') && document.getElementById('unitModeExisting').checked;
    if (isExistingMode) {
      selectUnitForProjectVideo(newUnit);
    }
  });
}

// =============================================================
// UNIT SELECTION INTEGRITY & ADD VIDEO (§7)
// =============================================================
function toggleUnitMode() {
  var isExisting = document.getElementById('unitModeExisting').checked;
  var searchContainer = document.getElementById('unitSelectContainer');
  var badge = document.getElementById('pvUnitLockedBadge');

  if (isExisting) {
    searchContainer.classList.remove('hidden');
  } else {
    searchContainer.classList.add('hidden');
    if (badge) badge.classList.add('hidden');

    // Unlock inputs for new unit entry
    ['pvClientName', 'pvLocation', 'pvUnitType', 'pvArea'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.readOnly = false;
        el.disabled = false;
        el.classList.remove('bg-slate-800/80', 'cursor-not-allowed', 'opacity-70');
      }
    });

    document.getElementById('pvSelectedUnitId').value = '';
    document.getElementById('pvUnitSearch').value = '';
    document.getElementById('pvClientName').value = '';
    document.getElementById('pvLocation').value = '';
    var ut = document.getElementById('pvUnitType');
    if (ut) ut.selectedIndex = 0;
    document.getElementById('pvArea').value = '';
    updateProjectVideoPreview();
  }
}

function filterUnitSearch(query) {
  var resultsBox = document.getElementById('pvUnitSearchResults');
  if (!query || query.trim().length < 1) {
    resultsBox.classList.add('hidden');
    return;
  }
  var q = query.toLowerCase().trim();
  var unitsPool = (AppState.unitLookups && AppState.unitLookups.length > 0) ? AppState.unitLookups : (AppState.allUnits || []);
  var matches = unitsPool.filter(function(u) {
    return (u.clientName && u.clientName.toLowerCase().indexOf(q) !== -1) ||
           (u.unitId && u.unitId.toLowerCase().indexOf(q) !== -1) ||
           (u.location && u.location.toLowerCase().indexOf(q) !== -1);
  });

  resultsBox.innerHTML = '';
  if (matches.length === 0) {
    resultsBox.innerHTML = '<div class="autocomplete-item text-slate-500 text-center text-xs">No matching units. Click \'New Unit\' to create one.</div>';
    resultsBox.classList.remove('hidden');
    return;
  }

  matches.forEach(function(u) {
    var div = document.createElement('div');
    div.className = 'autocomplete-item text-xs flex items-center justify-between';
    div.innerHTML =
      '<div>' +
        '<strong class="text-white">' + escapeHtml(u.clientName) + '</strong>' +
        '<div class="text-[10px] text-slate-400">' + escapeHtml(u.location) + ' &bull; ' + escapeHtml(u.unitType) + '</div>' +
      '</div>' +
      '<span class="font-mono-code text-[#DFBF7A] text-[10px]">' + escapeHtml(u.unitId) + '</span>';
    div.onclick = function() {
      selectUnitForProjectVideo(u);
    };
    resultsBox.appendChild(div);
  });
  resultsBox.classList.remove('hidden');
}

function selectUnitForProjectVideo(unit) {
  document.getElementById('pvSelectedUnitId').value = unit.unitId;
  document.getElementById('pvUnitSearch').value = unit.clientName + ' (' + unit.unitId + ' — ' + unit.location + ')';
  document.getElementById('pvClientName').value = unit.clientName;
  document.getElementById('pvLocation').value = unit.location;
  document.getElementById('pvUnitType').value = unit.unitType;
  document.getElementById('pvArea').value = unit.area || '';
  document.getElementById('pvUnitSearchResults').classList.add('hidden');

  // Prevent accidental editing of central metadata from Add Video (§7)
  ['pvClientName', 'pvLocation', 'pvUnitType', 'pvArea'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.readOnly = true;
      el.classList.add('bg-slate-800/80', 'cursor-not-allowed', 'opacity-70');
    }
  });

  var badge = document.getElementById('pvUnitLockedBadge');
  if (badge) badge.classList.remove('hidden');

  updateProjectVideoPreview();
}

function filterLocationSearch(query, resultsId, targetInputId) {
  var box = document.getElementById(resultsId);
  if (!query || query.trim().length < 1) {
    box.classList.add('hidden');
    return;
  }
  var q = query.toLowerCase().trim();
  var matches = (AppState.lists.locations || []).filter(function(loc) {
    return loc.toLowerCase().indexOf(q) !== -1;
  });

  box.innerHTML = '';
  matches.forEach(function(loc) {
    var div = document.createElement('div');
    div.className = 'autocomplete-item text-xs text-white';
    div.textContent = loc;
    div.onclick = function() {
      document.getElementById(targetInputId).value = loc;
      box.classList.add('hidden');
      if (targetInputId === 'pvLocation') {
        updateProjectVideoPreview();
      }
    };
    box.appendChild(div);
  });
  if (matches.length > 0) box.classList.remove('hidden');
  else box.classList.add('hidden');
}

function updateProjectVideoPreview() {
  var client = document.getElementById('pvClientName').value.trim();
  var loc = document.getElementById('pvLocation').value.trim();
  var stage = document.getElementById('pvProjectVideoType').value.trim();
  var space = document.getElementById('pvSpaceType').value.trim();
  var date = document.getElementById('pvShootingDate').value.trim();

  var parts = [];
  if (client) parts.push(client);
  if (loc) parts.push(loc);
  if (stage) parts.push(stage);
  if (space) parts.push(space);
  if (date) parts.push(date);
  parts.push('V01');

  document.getElementById('pvGeneratedFilenamePreview').textContent = parts.join(' - ') + '.mp4';
}

function handleMarketingContentTypeChange(type) {
  var spaceBox = document.getElementById('mcSpaceTypeContainer');
  if (type === 'Construction Walkthrough' || type === 'Before / After') {
    spaceBox.classList.remove('hidden');
  } else {
    spaceBox.classList.add('hidden');
    document.getElementById('mcSpaceType').value = '';
  }
  updateMarketingContentPreview();
}

function updateMarketingContentPreview() {
  var cType = document.getElementById('mcContentType').value.trim();
  var topic = document.getElementById('mcTopic').value.trim();
  var space = document.getElementById('mcSpaceType').value.trim();
  var date = document.getElementById('mcShootingDate').value.trim();

  var parts = [];
  if (cType) parts.push(cType);
  if (topic) parts.push(topic);
  if (space) parts.push(space);
  if (date) parts.push(date);
  parts.push('V01');

  document.getElementById('mcGeneratedFilenamePreview').textContent = parts.join(' - ') + '.mp4';
}

// =============================================================
// SUBMIT FORMS & PDF HARDENING (§8)
// =============================================================
function submitProjectVideo(e) {
  e.preventDefault();
  if (!AppState.isBootstrapped) {
    showToast('info', 'Please wait for the application to finish initialising.');
    return;
  }
  var btn = document.getElementById('btnSubmitProjectVideo');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Saving…';

  var payload = {
    unitId: document.getElementById('pvSelectedUnitId').value || '',
    videoLink: document.getElementById('pvVideoLink').value.trim(),
    clientName: document.getElementById('pvClientName').value.trim(),
    location: document.getElementById('pvLocation').value.trim(),
    unitType: document.getElementById('pvUnitType').value,
    area: document.getElementById('pvArea').value,
    projectVideoType: document.getElementById('pvProjectVideoType').value,
    spaceType: document.getElementById('pvSpaceType').value,
    workCategory: document.getElementById('pvWorkCategory').value,
    shootingDate: document.getElementById('pvShootingDate').value,
    versionNotes: document.getElementById('pvVersionNotes').value.trim()
  };

  var pdfFileInput = document.getElementById('pvPdfFileInput');
  if (pdfFileInput.files && pdfFileInput.files.length > 0) {
    var file = pdfFileInput.files[0];

    // PDF extension validation (§8)
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('error', 'Only PDF files (.pdf) are allowed.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Video</span>';
      return;
    }

    // PDF maximum 25MB check before Base64 conversion (§8)
    if (file.size > 25 * 1024 * 1024) {
      showToast('error', 'PDF file exceeds maximum allowed size of 25MB (' + (file.size / (1024 * 1024)).toFixed(1) + 'MB).');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Video</span>';
      return;
    }

    var reader = new FileReader();
    reader.onerror = function() {
      showToast('error', 'Failed to read PDF file. Please try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Video</span>';
    };
    reader.onabort = function() {
      showToast('error', 'PDF file reading was aborted.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Video</span>';
    };
    reader.onload = function(evt) {
      payload.pdfFileBase64 = evt.target.result.split(',')[1];
      payload.pdfFileName = file.name;
      payload.pdfDocumentTitle = document.getElementById('pvPdfTitle').value.trim() || file.name;
      executeSaveProjectVideo(payload, btn);
    };
    reader.readAsDataURL(file);
  } else {
    executeSaveProjectVideo(payload, btn);
  }
}

function executeSaveProjectVideo(payload, btn) {
  callApi('apiAddProjectVideo', [payload], function(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Video</span>';

    if (!res.ok) {
      showToast('error', res.message);
      // Preserve form values on failure (§8)
      return;
    }

    showToast('success', 'Project video saved: ' + res.data.video.videoName);
    document.getElementById('formProjectVideo').reset();
    document.getElementById('pvSelectedUnitId').value = '';
    updateProjectVideoPreview();
    loadDashboard();
    switchTab('library');
  });
}

function submitMarketingContent(e) {
  e.preventDefault();
  if (!AppState.isBootstrapped) {
    showToast('info', 'Please wait for the application to finish initialising.');
    return;
  }
  var btn = document.getElementById('btnSubmitMarketingContent');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Saving…';

  var payload = {
    videoLink: document.getElementById('mcVideoLink').value.trim(),
    contentType: document.getElementById('mcContentType').value,
    topic: document.getElementById('mcTopic').value.trim(),
    spaceType: document.getElementById('mcSpaceType').value,
    shootingDate: document.getElementById('mcShootingDate').value,
    versionNotes: document.getElementById('mcVersionNotes').value.trim()
  };

  callApi('apiAddMarketingContent', [payload], function(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Content</span>';

    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    showToast('success', 'Marketing content saved: ' + res.data.video.videoName);
    document.getElementById('formMarketingContent').reset();
    loadDashboard();
    switchTab('library');
  });
}

// =============================================================
// VIDEO LIBRARY — SEARCH, FILTERS & PAGINATION (§6, §9, §10)
// =============================================================
var librarySearchTimeout = null;
function debounceLibrarySearch() {
  clearTimeout(librarySearchTimeout);
  librarySearchTimeout = setTimeout(function() {
    AppState.libraryPage = 1;
    loadLibrary(1);
  }, 350);
}

function resetLibraryPageAndLoad() {
  AppState.libraryPage = 1;
  loadLibrary(1);
}

function prevLibraryPage() {
  if (AppState.libraryPage > 1) {
    loadLibrary(AppState.libraryPage - 1);
  }
}

function nextLibraryPage() {
  if (AppState.libraryPage < AppState.libraryTotalPages) {
    loadLibrary(AppState.libraryPage + 1);
  }
}

function changeLibraryPageSize(newSize) {
  var sz = parseInt(newSize, 10);
  if (!isNaN(sz) && sz > 0) {
    AppState.libraryPageSize = sz;
    AppState.libraryPage = 1;
    loadLibrary(1);
  }
}

function loadLibrary(page, callback) {
  if (typeof page === 'function') {
    callback = page;
    page = AppState.libraryPage || 1;
  }
  if (page) {
    AppState.libraryPage = page;
  }

  // Request sequence token for stale response protection (§9)
  var thisRequestId = ++AppState.searchRequestId;

  var minArea = document.getElementById('filterAreaMin') ? document.getElementById('filterAreaMin').value : '';
  var maxArea = document.getElementById('filterAreaMax') ? document.getElementById('filterAreaMax').value : '';

  var filters = {
    searchQuery: document.getElementById('filterSearch').value.trim(),
    videoSource: document.getElementById('filterSource').value,
    contentType: document.getElementById('filterContentType').value,
    projectVideoType: document.getElementById('filterStage').value,
    spaceType: document.getElementById('filterSpace').value,
    workCategory: document.getElementById('filterWorkCat').value,
    location: document.getElementById('filterLocation').value,
    unitType: document.getElementById('filterUnitType').value,
    areaMin: minArea !== '' ? parseFloat(minArea) : undefined,
    areaMax: maxArea !== '' ? parseFloat(maxArea) : undefined,
    dateFilterType: document.getElementById('filterDateType').value,
    startDate: document.getElementById('filterStartDate').value,
    endDate: document.getElementById('filterEndDate').value,
    includePreviousVersions: document.getElementById('filterIncludePrevious').checked,
    page: AppState.libraryPage || 1,
    pageSize: AppState.libraryPageSize || 25
  };

  var tbody = document.getElementById('libraryTableBody');
  tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-500"><div class="loader-spinner !w-5 !h-5 inline-block mr-2 align-middle"></div> Loading videos and applying filters…</td></tr>';

  callApi('apiGetVideos', [filters], function(res) {
    // Discard stale responses out of order (§9)
    if (thisRequestId !== AppState.searchRequestId) {
      return;
    }

    if (callback) callback();
    if (!res.ok) {
      tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-rose-400">' + escapeHtml(res.message) + '</td></tr>';
      return;
    }

    var data = res.data || {};
    var videos = Array.isArray(data) ? data : (data.items || []);
    var totalCount = (typeof data.totalCount === 'number') ? data.totalCount : videos.length;
    var totalPages = (typeof data.totalPages === 'number') ? data.totalPages : (Math.ceil(totalCount / (AppState.libraryPageSize || 25)) || 1);
    var curPage = (typeof data.page === 'number') ? data.page : (AppState.libraryPage || 1);

    AppState.allVideos = videos;
    AppState.libraryPage = curPage;
    AppState.libraryTotalPages = totalPages;

    var countEl = document.getElementById('libraryResultsCount');
    if (countEl) countEl.textContent = totalCount;

    var indEl = document.getElementById('libraryPageIndicator');
    if (indEl) indEl.textContent = 'Page ' + curPage + ' of ' + totalPages + ' (' + totalCount + ' total)';

    var prevBtn = document.getElementById('btnLibPrevPage');
    if (prevBtn) prevBtn.disabled = (curPage <= 1);
    var nextBtn = document.getElementById('btnLibNextPage');
    if (nextBtn) nextBtn.disabled = (curPage >= totalPages);

    if (videos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-500">No videos match the current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    videos.forEach(function(v) {
      var tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition';

      var isCur = !!v.isCurrentVersion;
      var verChip = isCur
        ? '<span class="chip chip-current font-mono-code">' + escapeHtml(v.versionNumber) + ' &middot; Current</span>'
        : '<span class="chip chip-previous font-mono-code">' + escapeHtml(v.versionNumber) + ' &middot; Previous</span>';

      var srcChip = (v.videoSource === 'Project Video')
        ? '<span class="chip chip-project">Project</span>'
        : '<span class="chip chip-marketing">Marketing</span>';

      var fileId = (v.driveFileId && /^[a-zA-Z0-9_-]{20,}$/.test(v.driveFileId)) ? v.driveFileId : '';
      var driveLink = fileId ? ('https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view?usp=drivesdk') : '#';

      tr.innerHTML =
        '<td class="p-3.5 font-mono-code text-[#DFBF7A] font-bold">' + escapeHtml(v.videoNumber) + '</td>' +
        '<td class="p-3.5 whitespace-nowrap">' + verChip + '</td>' +
        '<td class="p-3.5 whitespace-nowrap">' + srcChip + '</td>' +
        '<td class="p-3.5 font-mono-code text-white font-semibold max-w-xs truncate" title="' + escapeHtml(v.videoName) + '">' +
          escapeHtml(v.videoName) +
        '</td>' +
        '<td class="p-3.5 text-slate-300 font-bold whitespace-nowrap">' + escapeHtml(v.clientName || v.topic || '—') + '</td>' +
        '<td class="p-3.5 text-slate-400 whitespace-nowrap">' + escapeHtml(v.location || '—') + '</td>' +
        '<td class="p-3.5 text-slate-400 whitespace-nowrap">' + escapeHtml((v.projectVideoType || '') + (v.spaceType ? ' / ' + v.spaceType : '')) + '</td>' +
        '<td class="p-3.5 text-amber-300/90 font-semibold whitespace-nowrap">' + escapeHtml(v.workCategory || '—') + '</td>' +
        '<td class="p-3.5 font-num text-slate-400 whitespace-nowrap">' + escapeHtml(v.shootingDate || '—') + '</td>' +
        '<td class="p-3.5 text-center whitespace-nowrap">' +
          '<div class="flex items-center justify-center gap-1.5">' +
            (fileId ? ('<button type="button" class="btn-lib-preview action-btn-icon bg-sky-500/15 text-sky-400 hover:bg-sky-500/30 border-sky-500/20" title="Preview video" data-file-id="' + escapeHtml(fileId) + '" data-title="' + escapeHtml(v.videoName || '') + '" aria-label="Preview video">' +
              '<i class="fa-solid fa-play"></i>' +
            '</button>') : '') +
            (fileId ? ('<a href="' + driveLink + '" target="_blank" rel="noopener noreferrer" title="Open in Google Drive" class="action-btn-icon bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700" aria-label="Open in Google Drive">' +
              '<i class="fa-solid fa-arrow-up-right-from-square"></i>' +
            '</a>') : '') +
            '<button type="button" class="btn-lib-edit-meta action-btn-icon bg-amber-500/15 text-[#DFBF7A] hover:bg-amber-500/30 border-amber-500/20" title="Edit metadata" data-video-number="' + escapeHtml(v.videoNumber) + '" data-file-id="' + escapeHtml(fileId) + '" aria-label="Edit metadata">' +
              '<i class="fa-solid fa-pen-to-square"></i>' +
            '</button>' +
            '<button type="button" class="btn-lib-add-ver action-btn-icon bg-blue-500/15 text-blue-400 hover:bg-blue-500/30 border-blue-500/20" title="Add new version" data-video-number="' + escapeHtml(v.videoNumber) + '" aria-label="Add new version">' +
              '<i class="fa-solid fa-code-branch"></i>' +
            '</button>' +
            '<button type="button" class="btn-lib-ver-hist action-btn-icon bg-purple-500/15 text-purple-300 hover:bg-purple-500/30 border-purple-500/20" title="Version history" data-video-number="' + escapeHtml(v.videoNumber) + '" aria-label="Version history">' +
              '<i class="fa-solid fa-clock-rotate-left"></i>' +
            '</button>' +
          '</div>' +
        '</td>';

      tbody.appendChild(tr);
    });
  });
}

function resetLibraryFilters() {
  document.getElementById('filterSearch').value = '';
  document.getElementById('filterSource').value = '';
  document.getElementById('filterContentType').value = '';
  document.getElementById('filterStage').value = '';
  document.getElementById('filterSpace').value = '';
  document.getElementById('filterWorkCat').value = '';
  document.getElementById('filterLocation').value = '';
  document.getElementById('filterUnitType').value = '';
  var aMin = document.getElementById('filterAreaMin');
  if (aMin) aMin.value = '';
  var aMax = document.getElementById('filterAreaMax');
  if (aMax) aMax.value = '';
  document.getElementById('filterStartDate').value = '';
  document.getElementById('filterEndDate').value = '';
  document.getElementById('filterIncludePrevious').checked = false;
  AppState.libraryPage = 1;
  loadLibrary(1);
}

// =============================================================
// VIDEO PREVIEW MODAL (§5)
// =============================================================
function openVideoPreviewModal(driveFileId, videoTitle) {
  if (!driveFileId || !/^[a-zA-Z0-9_-]{20,}$/.test(driveFileId)) {
    showToast('error', 'Invalid Google Drive file ID for video preview.');
    return;
  }

  var titleEl = document.getElementById('modalVideoPreviewTitle');
  if (titleEl) titleEl.textContent = videoTitle || 'Video Preview';

  var subEl = document.getElementById('vpFileIdSubtitle');
  if (subEl) subEl.textContent = 'Drive File ID: ' + driveFileId;

  var streamUrl = 'https://drive.google.com/file/d/' + encodeURIComponent(driveFileId) + '/preview';
  var directUrl = 'https://drive.google.com/file/d/' + encodeURIComponent(driveFileId) + '/view?usp=drivesdk';

  var directLink = document.getElementById('vpDirectDriveLink');
  if (directLink) directLink.href = directUrl;

  var spinner = document.getElementById('vpLoadingSpinner');
  if (spinner) spinner.classList.remove('hidden');

  var iframe = document.getElementById('vpIframe');
  if (iframe) {
    iframe.onload = function() {
      if (spinner) spinner.classList.add('hidden');
    };
    iframe.src = streamUrl;
  }

  openModal('modalVideoPreview');
}

function closeVideoPreviewModal() {
  var iframe = document.getElementById('vpIframe');
  if (iframe) iframe.src = ''; // Halt media playback immediately
  closeModal('modalVideoPreview');
}

// =============================================================
// EDIT VIDEO METADATA MODAL (§4)
// =============================================================
function openEditVideoMetadataModal(videoNumber, optDriveFileId) {
  if (!videoNumber) return;

  function populateAndOpen(video) {
    AppState.activeEditingVideo = video;
    document.getElementById('emDriveFileId').value = video.driveFileId;
    document.getElementById('emVideoNumber').value = video.videoNumber;
    document.getElementById('emVersionNumber').value = video.versionNumber;
    document.getElementById('emVideoSource').value = video.videoSource;

    document.getElementById('modalEditMetaTitle').textContent = 'Edit Video Metadata — ' + video.videoNumber;
    document.getElementById('emHeaderSubtitle').textContent = (video.videoSource || '') + ' (' + (video.versionNumber || 'V01') + ')';
    document.getElementById('emCurrentFilename').textContent = video.videoName || '—';

    var isProject = (video.videoSource === 'Project Video');
    var projContainer = document.getElementById('emProjectFieldsContainer');
    var mktContainer = document.getElementById('emMarketingFieldsContainer');

    if (isProject) {
      if (projContainer) projContainer.classList.remove('hidden');
      if (mktContainer) mktContainer.classList.add('hidden');
      var st = document.getElementById('emSpaceType');
      if (st) st.value = video.spaceType || '';
      var wc = document.getElementById('emWorkCategory');
      if (wc) wc.value = video.workCategory || '';
      var sd = document.getElementById('emShootingDate');
      if (sd) sd.value = video.shootingDate || '';
    } else {
      if (projContainer) projContainer.classList.add('hidden');
      if (mktContainer) mktContainer.classList.remove('hidden');
      var ct = document.getElementById('emContentType');
      if (ct) ct.value = video.contentType || '';
      var tp = document.getElementById('emTopic');
      if (tp) tp.value = video.topic || '';
      var mst = document.getElementById('emMarketingSpaceType');
      if (mst) mst.value = video.spaceType || '';
      var msd = document.getElementById('emMarketingShootingDate');
      if (msd) msd.value = video.shootingDate || '';
    }

    var chk = document.getElementById('emConfirmRename');
    if (chk) chk.checked = false;

    updateEditMetaPreview();
    openModal('modalEditVideoMetadata');
  }

  // Check local AppState.allVideos first
  var v = (AppState.allVideos || []).find(function(item) {
    return optDriveFileId ? (item.driveFileId === optDriveFileId) : (item.videoNumber === videoNumber && item.isCurrentVersion);
  });
  if (v) {
    populateAndOpen(v);
    return;
  }

  // Fallback: Fetch complete version history from server
  showGlobalLoading('Loading video metadata…');
  callApi('apiGetVideoVersionHistory', [videoNumber], function(res) {
    hideGlobalLoading();
    if (!res.ok || !res.data) {
      showToast('error', res.message || 'Could not load video metadata.');
      return;
    }
    var list = Array.isArray(res.data) ? res.data : (res.data.versions || []);
    if (list.length === 0) {
      showToast('error', 'Video not found.');
      return;
    }
    var target = (optDriveFileId ? list.find(function(item) { return item.driveFileId === optDriveFileId; }) : null) ||
                 list.find(function(item) { return item.isCurrentVersion; }) ||
                 list[0];
    populateAndOpen(target);
  });
}

function updateEditMetaPreview() {
  var v = AppState.activeEditingVideo;
  if (!v) return;

  var isProject = (v.videoSource === 'Project Video');
  var currentName = v.videoName || '';
  var proposedName = '';

  if (isProject) {
    var client = v.clientName || '';
    var loc = v.location || '';
    var stage = v.projectVideoType || '';
    var space = document.getElementById('emSpaceType').value;
    var date = document.getElementById('emShootingDate').value;
    var ver = v.versionNumber || 'V01';

    var parts = [];
    if (client) parts.push(client);
    if (loc) parts.push(loc);
    if (stage) parts.push(stage);
    if (space) parts.push(space);
    if (date) parts.push(date);
    parts.push(ver);
    proposedName = parts.join(' - ') + '.mp4';
  } else {
    var cType = document.getElementById('emContentType').value;
    var topic = document.getElementById('emTopic').value.trim();
    var mSpace = document.getElementById('emMarketingSpaceType').value;
    var mDate = document.getElementById('emMarketingShootingDate').value;
    var mVer = v.versionNumber || 'V01';

    var mParts = [];
    if (cType) mParts.push(cType);
    if (topic) mParts.push(topic);
    if (mSpace) mParts.push(mSpace);
    if (mDate) mParts.push(mDate);
    mParts.push(mVer);
    proposedName = mParts.join(' - ') + '.mp4';
  }

  var propEl = document.getElementById('emProposedFilename');
  if (propEl) propEl.textContent = proposedName;

  var notice = document.getElementById('emRenameNotice');
  var nameChanged = (currentName !== proposedName);
  if (notice) {
    if (nameChanged) {
      notice.classList.remove('hidden');
    } else {
      notice.classList.add('hidden');
    }
  }
}

function closeEditVideoMetadataModal() {
  closeModal('modalEditVideoMetadata');
}

function submitEditVideoMetadata(e) {
  e.preventDefault();
  var v = AppState.activeEditingVideo;
  if (!v) return;

  var driveFileId = document.getElementById('emDriveFileId').value;
  var isProject = (v.videoSource === 'Project Video');
  var currentName = v.videoName || '';
  var proposedName = document.getElementById('emProposedFilename').textContent;
  var nameChanged = (currentName !== proposedName);
  var confirmRename = document.getElementById('emConfirmRename').checked;

  if (nameChanged && !confirmRename) {
    showToast('warning', 'Please authorize renaming the Google Drive file to proceed with metadata changes.');
    return;
  }

  var updatedFields = {};
  if (isProject) {
    updatedFields.spaceType = document.getElementById('emSpaceType').value;
    updatedFields.workCategory = document.getElementById('emWorkCategory').value;
    updatedFields.shootingDate = document.getElementById('emShootingDate').value;
  } else {
    updatedFields.contentType = document.getElementById('emContentType').value;
    updatedFields.topic = document.getElementById('emTopic').value.trim();
    updatedFields.spaceType = document.getElementById('emMarketingSpaceType').value;
    updatedFields.shootingDate = document.getElementById('emMarketingShootingDate').value;
  }

  var btn = document.getElementById('btnSubmitEditMetadata');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Saving…';

  callApi('apiUpdateSingleVideoMetadata', [driveFileId, updatedFields, confirmRename], function(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Save Changes</span>';

    if (!res.ok) {
      showToast('error', res.message || 'Failed to update video metadata.');
      return;
    }

    if (res.data && res.data.requiresRenameConfirmation) {
      document.getElementById('emRenameNotice').classList.remove('hidden');
      showToast('warning', res.data.message || 'Drive rename confirmation required.');
      return;
    }

    showToast('success', 'Video metadata updated successfully.');
    closeEditVideoMetadataModal();
    loadLibrary(AppState.libraryPage || 1);
    loadDashboard();
  });
}

// =============================================================
// ADD NEW VERSION MODAL (§3)
// =============================================================
function openAddVersionModal(videoNumber) {
  if (!videoNumber) return;

  function populateAndOpen(matching) {
    var currentVer = matching.find(function(v) { return v.isCurrentVersion; }) || matching[0];
    AppState.activeVideoForVersion = currentVer;

    document.getElementById('mvVideoNumber').value = videoNumber;
    document.getElementById('mvVideoHeader').textContent = 'Video ' + videoNumber + ' — ' + (currentVer.clientName || currentVer.topic || 'Video');
    document.getElementById('mvVideoLink').value = '';
    document.getElementById('mvVersionNotes').value = '';

    var maxVer = 0;
    matching.forEach(function(v) {
      var match = String(v.versionNumber).match(/V?(\d+)/i);
      if (match && match[1]) {
        var n = parseInt(match[1], 10);
        if (n > maxVer) maxVer = n;
      }
    });
    var nextVerStr = 'V' + (maxVer + 1 < 10 ? '0' + (maxVer + 1) : String(maxVer + 1));
    document.getElementById('mvTargetVersionBadge').textContent = nextVerStr;

    updateVersionModalPreview();
    openModal('modalAddVersion');
  }

  // 1. Try local AppState.allVideos
  var matching = (AppState.allVideos || []).filter(function(v) {
    return v.videoNumber === videoNumber;
  });

  // 2. Try AppState.activeUnitDetail (when clicked from Unit Details without opening library)
  if (matching.length === 0 && AppState.activeUnitDetail && AppState.activeUnitDetail.videos) {
    var unitVid = AppState.activeUnitDetail.videos.find(function(uv) { return uv.videoNumber === videoNumber; });
    if (unitVid) {
      var cur = unitVid.currentVersion || (unitVid.versions && unitVid.versions[0]) || {};
      matching = [{
        videoNumber: unitVid.videoNumber,
        versionNumber: cur.versionNumber || 'V01',
        isCurrentVersion: true,
        clientName: AppState.activeUnitDetail.unit.clientName,
        location: AppState.activeUnitDetail.unit.location,
        projectVideoType: unitVid.projectVideoType,
        spaceType: unitVid.spaceType,
        workCategory: unitVid.workCategory || '',
        videoSource: 'Project Video',
        shootingDate: cur.shootingDate || ''
      }];
    }
  }

  // 3. Fallback: Fetch complete history from server (§3)
  if (matching.length === 0) {
    showGlobalLoading('Loading video details…');
    callApi('apiGetVideoVersionHistory', [videoNumber], function(res) {
      hideGlobalLoading();
      if (!res.ok || !res.data) {
        showToast('error', res.message || 'Could not load video details.');
        return;
      }
      var list = Array.isArray(res.data) ? res.data : (res.data.versions || []);
      if (list.length === 0) {
        showToast('error', 'Video not found on server.');
        return;
      }
      populateAndOpen(list);
    });
    return;
  }

  populateAndOpen(matching);
}

function closeAddVersionModal() {
  closeModal('modalAddVersion');
}

function updateVersionModalPreview() {
  var v = AppState.activeVideoForVersion;
  if (!v) return;

  var nextVer = document.getElementById('mvTargetVersionBadge').textContent;
  var isProject = (v.videoSource === 'Project Video');

  var parts = [];
  if (isProject) {
    if (v.clientName) parts.push(v.clientName);
    if (v.location) parts.push(v.location);
    if (v.projectVideoType) parts.push(v.projectVideoType);
    if (v.spaceType) parts.push(v.spaceType);
    if (v.shootingDate) parts.push(v.shootingDate);
    parts.push(nextVer);
  } else {
    if (v.contentType) parts.push(v.contentType);
    if (v.topic) parts.push(v.topic);
    if (v.spaceType) parts.push(v.spaceType);
    if (v.shootingDate) parts.push(v.shootingDate);
    parts.push(nextVer);
  }

  document.getElementById('mvProposedFilename').textContent = parts.join(' - ') + '.mp4';
}

function submitAddVersion(e) {
  e.preventDefault();
  var btn = document.getElementById('btnSubmitAddVersion');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Saving version…';

  var payload = {
    videoNumber: document.getElementById('mvVideoNumber').value,
    videoLink: document.getElementById('mvVideoLink').value.trim(),
    versionNotes: document.getElementById('mvVersionNotes').value.trim()
  };

  callApi('apiAddNewVersion', [payload], function(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Save New Version</span>';

    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    showToast('success', 'New version saved: ' + res.data.videoName);
    closeAddVersionModal();
    loadDashboard();
    loadLibrary(AppState.libraryPage || 1);
  });
}

// =============================================================
// COMPLETE VERSION HISTORY MODAL (§2, §3)
// =============================================================
function openVersionHistoryModal(videoNumber) {
  if (!videoNumber) return;

  showGlobalLoading('Loading version history…');
  callApi('apiGetVideoVersionHistory', [videoNumber], function(res) {
    hideGlobalLoading();
    if (!res.ok) {
      showToast('error', res.message || 'Failed to load version history.');
      return;
    }

    var versions = Array.isArray(res.data) ? res.data : ((res.data && res.data.versions) || []);
    if (versions.length === 0) {
      showToast('info', 'No versions found for Video ' + videoNumber);
      return;
    }

    var title = 'Video ' + videoNumber + ' — ' + (versions[0].clientName || versions[0].topic || 'History');
    document.getElementById('vhVideoTitle').textContent = title;

    var container = document.getElementById('vhVersionsList');
    container.innerHTML = '';

    versions.forEach(function(ver) {
      var isCur = !!ver.isCurrentVersion;
      var div = document.createElement('div');
      div.className = 'p-3.5 rounded-xl ' + (isCur ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-[#081120] border border-slate-800') + ' space-y-2';

      var fileId = (ver.driveFileId && /^[a-zA-Z0-9_-]{20,}$/.test(ver.driveFileId)) ? ver.driveFileId : '';
      var driveLink = fileId ? ('https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view?usp=drivesdk') : '#';

      div.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<div class="flex items-center gap-2">' +
            '<span class="font-mono-code font-bold text-sm ' + (isCur ? 'text-emerald-400' : 'text-slate-300') + '">' + escapeHtml(ver.versionNumber) + '</span>' +
            (isCur ? '<span class="chip chip-current">Current</span>' : '<span class="chip chip-previous">Previous</span>') +
          '</div>' +
          '<div class="flex items-center gap-2">' +
            (fileId ? ('<button type="button" class="btn-action-preview text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1" data-file-id="' + escapeHtml(fileId) + '" data-title="' + escapeHtml(ver.videoName || '') + '">' +
              '<i class="fa-solid fa-play text-[10px]"></i> <span>Preview</span>' +
            '</button>') : '') +
            (fileId ? ('<a href="' + driveLink + '" target="_blank" rel="noopener noreferrer" class="text-xs text-[#DFBF7A] hover:underline font-bold flex items-center gap-1">' +
              '<span>Drive</span> <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>' +
            '</a>') : '') +
          '</div>' +
        '</div>' +
        '<div class="text-xs font-mono-code text-white break-all">' + escapeHtml(ver.videoName || '') + '</div>' +
        '<div class="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">' +
          '<span>' + escapeHtml(ver.versionNotes || 'No notes') + '</span>' +
          '<span class="font-num">' + escapeHtml(ver.addedDate || '') + '</span>' +
        '</div>';

      container.appendChild(div);
    });

    openModal('modalVersionHistory');
  });
}

function closeVersionHistoryModal() {
  closeModal('modalVersionHistory');
}

// =============================================================
// UNITS & DESIGN PDFS CATALOG (§9, §10)
// =============================================================
function loadUnitsCatalog(callback) {
  var thisRequestId = ++AppState.unitsRequestId;
  callApi('apiGetUnits', [], function(res) {
    if (thisRequestId !== AppState.unitsRequestId) return;
    if (callback) callback();
    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    var units = res.data || [];
    AppState.allUnits = units;
    renderUnitsCatalog(units);
  });
}

function renderUnitsCatalog(units) {
  var grid = document.getElementById('unitsCatalogGrid');
  grid.innerHTML = '';

  if (units.length === 0) {
    grid.innerHTML = '<div class="col-span-full p-8 text-center text-slate-500">No units on file yet. Click \'Create New Unit\' to add one.</div>';
    return;
  }

  units.forEach(function(u) {
    var card = document.createElement('div');
    card.className = 'gold-card p-4 space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition cursor-pointer';
    card.onclick = function(e) {
      // Prevent opening detail if an inner action button was clicked
      if (e.target.closest('button') || e.target.closest('a')) return;
      openUnitDetail(u.unitId);
    };

    card.innerHTML =
      '<div class="space-y-1.5">' +
        '<div class="flex items-center justify-between">' +
          '<span class="font-mono-code text-[#DFBF7A] text-xs font-bold">' + escapeHtml(u.unitId) + '</span>' +
          '<span class="chip chip-project">' + escapeHtml(u.unitType) + '</span>' +
        '</div>' +
        '<h4 class="text-sm font-bold text-white">' + escapeHtml(u.clientName) + '</h4>' +
        '<div class="text-xs text-slate-400 flex items-center gap-1">' +
          '<i class="fa-solid fa-location-dot text-slate-500"></i>' +
          '<span>' + escapeHtml(u.location) + '</span>' +
          (u.area ? (' &bull; <span class="font-num">' + escapeHtml(String(u.area)) + ' sqm</span>') : '') +
        '</div>' +
      '</div>' +
      '<div class="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">' +
        '<span><strong class="text-white font-num">' + (u.videoCount || 0) + '</strong> videos</span>' +
        '<span><strong class="text-white font-num">' + (u.pdfCount || 0) + '</strong> PDFs</span>' +
        '<button type="button" class="text-xs text-[#DFBF7A] font-bold hover:underline" aria-label="Open unit detail">' +
          '<span>View</span> <i class="fa-solid fa-chevron-right text-[10px]"></i>' +
        '</button>' +
      '</div>';

    grid.appendChild(card);
  });
}

function filterUnitsCatalog(query) {
  if (!AppState.allUnits) return;
  if (!query || query.trim().length === 0) {
    renderUnitsCatalog(AppState.allUnits);
    return;
  }
  var q = query.toLowerCase().trim();
  var filtered = AppState.allUnits.filter(function(u) {
    return (u.clientName && u.clientName.toLowerCase().indexOf(q) !== -1) ||
           (u.unitId && u.unitId.toLowerCase().indexOf(q) !== -1) ||
           (u.location && u.location.toLowerCase().indexOf(q) !== -1) ||
           (u.unitType && u.unitType.toLowerCase().indexOf(q) !== -1);
  });
  renderUnitsCatalog(filtered);
}

function openUnitDetail(unitId) {
  showGlobalLoading('Loading unit details…');
  callApi('apiGetUnitDetail', [unitId], function(res) {
    hideGlobalLoading();
    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    var detail = res.data;
    AppState.activeUnitDetail = detail;

    document.getElementById('udClientName').textContent = detail.unit.clientName;
    document.getElementById('udUnitIdBadge').textContent = detail.unit.unitId;
    document.getElementById('udLocationType').textContent = detail.unit.location + ' • ' + detail.unit.unitType + (detail.unit.area ? ' (' + detail.unit.area + ' sqm)' : '');

    document.getElementById('unitEditFormContainer').classList.add('hidden');
    document.getElementById('ueClientName').value = detail.unit.clientName;
    document.getElementById('ueLocation').value = detail.unit.location;
    document.getElementById('ueUnitType').value = detail.unit.unitType;
    document.getElementById('ueArea').value = detail.unit.area || '';

    var vContainer = document.getElementById('udVideosList');
    vContainer.innerHTML = '';
    if (detail.videos.length === 0) {
      vContainer.innerHTML = '<div class="text-xs text-slate-500 text-center py-2">No videos linked to this unit yet.</div>';
    } else {
      detail.videos.forEach(function(v) {
        var vDiv = document.createElement('div');
        vDiv.className = 'p-2.5 rounded-xl bg-[#081120] border border-slate-800 text-xs flex items-center justify-between';
        var curVer = v.currentVersion || (v.versions && v.versions[0]) || {};
        var fileId = (curVer.driveFileId && /^[a-zA-Z0-9_-]{20,}$/.test(curVer.driveFileId)) ? curVer.driveFileId : '';

        vDiv.innerHTML =
          '<div>' +
            '<div class="flex items-center gap-2">' +
              '<span class="font-mono-code text-[#DFBF7A] font-bold">Video ' + escapeHtml(v.videoNumber) + '</span>' +
              '<span class="chip chip-current">' + escapeHtml(curVer.versionNumber || 'V01') + '</span>' +
              '<span class="text-slate-300 font-semibold">' + escapeHtml(v.projectVideoType || '') + ' (' + escapeHtml(v.spaceType || '') + ')</span>' +
            '</div>' +
            '<div class="text-[10px] font-mono-code text-slate-400 mt-0.5 truncate max-w-sm">' + escapeHtml(curVer.videoName || '') + '</div>' +
          '</div>' +
          '<div class="flex items-center gap-1.5">' +
            (fileId ? ('<button type="button" class="btn-ud-preview action-btn-icon bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border-sky-500/20" data-file-id="' + escapeHtml(fileId) + '" data-title="' + escapeHtml(curVer.videoName || '') + '" title="Preview video" aria-label="Preview video"><i class="fa-solid fa-play"></i></button>') : '') +
            '<button type="button" class="btn-ud-add-ver action-btn-icon bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/20" data-video-number="' + escapeHtml(v.videoNumber) + '" title="Add version" aria-label="Add version"><i class="fa-solid fa-code-branch"></i></button>' +
            '<button type="button" class="btn-ud-ver-hist action-btn-icon bg-amber-500/20 text-[#DFBF7A] hover:bg-amber-500/30 border-amber-500/20" data-video-number="' + escapeHtml(v.videoNumber) + '" title="Version history" aria-label="Version history"><i class="fa-solid fa-clock-rotate-left"></i></button>' +
          '</div>';
        vContainer.appendChild(vDiv);
      });
    }

    var pContainer = document.getElementById('udPdfsList');
    pContainer.innerHTML = '';
    if (detail.pdfs.length === 0) {
      pContainer.innerHTML = '<div class="text-xs text-slate-500 text-center py-2">No design PDFs for this unit yet.</div>';
    } else {
      detail.pdfs.forEach(function(pdf) {
        var isCur = !!pdf.isCurrentVersion;
        var pDiv = document.createElement('div');
        pDiv.className = 'p-2.5 rounded-xl ' + (isCur ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-[#081120] border border-slate-800') + ' text-xs flex items-center justify-between';
        var pdfFileId = (pdf.driveFileId && /^[a-zA-Z0-9_-]{20,}$/.test(pdf.driveFileId)) ? pdf.driveFileId : '';
        var pdfLink = pdfFileId ? ('https://drive.google.com/file/d/' + encodeURIComponent(pdfFileId) + '/view?usp=drivesdk') : '#';

        pDiv.innerHTML =
          '<div>' +
            '<div class="flex items-center gap-2">' +
              '<i class="fa-solid fa-file-pdf text-rose-400"></i>' +
              '<span class="font-bold text-white">' + escapeHtml(pdf.documentTitle) + '</span>' +
              '<span class="font-mono-code text-[10px] px-1.5 py-0.5 rounded ' + (isCur ? 'chip-current' : 'chip-previous') + ' chip">' + escapeHtml(pdf.pdfVersionNumber || 'V01') + '</span>' +
            '</div>' +
            '<div class="text-[10px] text-slate-400 mt-0.5">' + escapeHtml(pdf.versionNotes || '') + ' &bull; ' + escapeHtml(pdf.addedDate || '') + '</div>' +
          '</div>' +
          (pdfFileId ? ('<a href="' + pdfLink + '" target="_blank" rel="noopener noreferrer" class="action-btn-icon bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border-rose-500/20" title="View PDF in Google Drive" aria-label="View PDF in Google Drive">' +
            '<i class="fa-solid fa-arrow-up-right-from-square"></i>' +
          '</a>') : '');
        pContainer.appendChild(pDiv);
      });
    }

    openModal('modalUnitDetail');
  });
}

function closeUnitDetailModal() {
  closeModal('modalUnitDetail');
}

function toggleUnitEditMode() {
  document.getElementById('unitEditFormContainer').classList.toggle('hidden');
}

function saveUnitMasterEdit(e) {
  e.preventDefault();
  var detail = AppState.activeUnitDetail;
  if (!detail) return;

  var currentUnit = detail.unit;
  var newClient = document.getElementById('ueClientName').value.trim();
  var newLoc = document.getElementById('ueLocation').value.trim();
  var newType = document.getElementById('ueUnitType').value;
  var newArea = document.getElementById('ueArea').value;

  var clientChanged = (newClient !== currentUnit.clientName);
  var locChanged = (newLoc !== currentUnit.location);

  var fields = {
    clientName: newClient,
    location: newLoc,
    unitType: newType,
    area: newArea ? parseFloat(newArea) : ''
  };

  if ((clientChanged || locChanged) && detail.videos && detail.videos.length > 0) {
    showBatchRenameModal(currentUnit, fields, detail.videos);
  } else {
    executeSaveUnitEdit(currentUnit.unitId, fields, false);
  }
}

function executeSaveUnitEdit(unitId, fields, executeBatchRename) {
  var btn = document.getElementById('btnSaveUnitEdit');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Saving…';

  callApi('apiUpdateUnit', [unitId, fields, executeBatchRename], function(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Save Changes</span>';

    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    showToast('success', 'Unit updated successfully.');
    document.getElementById('unitEditFormContainer').classList.add('hidden');
    openUnitDetail(unitId);
    loadUnitsCatalog();
    loadDashboard();
  });
}

function showBatchRenameModal(currentUnit, updatedFields, videos) {
  AppState.pendingUnitEdit = {
    unitId: currentUnit.unitId,
    fields: updatedFields
  };

  var tableBody = document.getElementById('brVideosTableBody');
  tableBody.innerHTML = '';

  videos.forEach(function(v) {
    var curVer = v.currentVersion || (v.versions && v.versions[0]) || {};
    var oldName = curVer.videoName || 'Old Name';
    var newName = oldName
      .replace(currentUnit.clientName, updatedFields.clientName)
      .replace(currentUnit.location, updatedFields.location);

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="p-2 font-mono-code text-[#DFBF7A]">' + escapeHtml(v.videoNumber) + '</td>' +
      '<td class="p-2 font-mono-code text-slate-400 line-through">' + escapeHtml(oldName) + '</td>' +
      '<td class="p-2 font-mono-code text-emerald-400 font-bold">' + escapeHtml(newName) + '</td>';
    tableBody.appendChild(tr);
  });

  openModal('modalBatchRename');
}

function cancelBatchRename() {
  closeModal('modalBatchRename');
  AppState.pendingUnitEdit = null;
}

function confirmBatchRename() {
  if (!AppState.pendingUnitEdit) return;
  var pe = AppState.pendingUnitEdit;
  closeModal('modalBatchRename');
  executeSaveUnitEdit(pe.unitId, pe.fields, true);
  AppState.pendingUnitEdit = null;
}

function openUploadPdfModalForCurrentUnit() {
  var detail = AppState.activeUnitDetail;
  if (!detail) return;

  document.getElementById('upUnitId').value = detail.unit.unitId;
  document.getElementById('upModalUnitHeader').textContent = 'Unit: ' + detail.unit.clientName + ' (' + detail.unit.unitId + ')';
  document.getElementById('upDocumentTitle').value = '';
  document.getElementById('upVersionNotes').value = '';
  document.getElementById('upPdfFile').value = '';

  openModal('modalUploadPdf');
}

function closeUploadPdfModal() {
  closeModal('modalUploadPdf');
}

function submitUploadPdf(e) {
  e.preventDefault();
  var fileInput = document.getElementById('upPdfFile');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('error', 'Please choose a valid PDF file.');
    return;
  }

  var file = fileInput.files[0];

  // Extension check (§8)
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('error', 'Only PDF files (.pdf) are allowed.');
    return;
  }

  // 25MB check (§8)
  if (file.size > 25 * 1024 * 1024) {
    showToast('error', 'PDF file exceeds maximum allowed size of 25MB (' + (file.size / (1024 * 1024)).toFixed(1) + 'MB).');
    return;
  }

  var btn = document.getElementById('btnSubmitUploadPdf');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Uploading…';

  var unitId = document.getElementById('upUnitId').value;
  var docTitle = document.getElementById('upDocumentTitle').value.trim() || file.name;
  var verNotes = document.getElementById('upVersionNotes').value.trim();

  function onPdfSuccess(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload"></i> <span>Upload &amp; Archive</span>';

    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    var successMsg = (res.data && res.data.versionNumber)
      ? ('Design PDF uploaded as ' + res.data.versionNumber + '.')
      : 'Design PDF uploaded as next version.';
    showToast('success', successMsg);

    closeUploadPdfModal();
    if (AppState.activeUnitDetail) {
      openUnitDetail(AppState.activeUnitDetail.unit.unitId);
    }
    loadUnitsCatalog();
    loadDashboard();
  }

  // Resumable direct Google Drive upload if OAuth access token is active (§15)
  if (getAuthToken()) {
    uploadPdfDirectToDrive(file)
      .then(function(driveRes) {
        if (driveRes && driveRes.ok && driveRes.driveFileId) {
          var payload = {
            unitId: unitId,
            fileName: file.name,
            documentTitle: docTitle,
            versionNotes: verNotes,
            driveFileId: driveRes.driveFileId,
            fileSize: file.size
          };
          callApi('apiUploadPdf', [payload], onPdfSuccess);
        } else {
          fallbackBase64PdfUpload();
        }
      })
      .catch(function() {
        fallbackBase64PdfUpload();
      });
    return;
  }

  fallbackBase64PdfUpload();

  function fallbackBase64PdfUpload() {
    var reader = new FileReader();
    reader.onerror = function() {
      showToast('error', 'Failed to read PDF file. Please try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-upload"></i> <span>Upload &amp; Archive</span>';
    };
    reader.onabort = function() {
      showToast('error', 'PDF file reading was aborted.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-upload"></i> <span>Upload &amp; Archive</span>';
    };
    reader.onload = function(evt) {
      var payload = {
        unitId: unitId,
        fileName: file.name,
        documentTitle: docTitle,
        versionNotes: verNotes,
        base64Content: evt.target.result.split(',')[1]
      };
      callApi('apiUploadPdf', [payload], onPdfSuccess);
    };
    reader.readAsDataURL(file);
  }
}

// =============================================================
// SETTINGS & SYSTEM AUDIT (§11)
// =============================================================
function loadSettings(callback) {
  if (!AppState.currentUser || AppState.currentUser.role !== 'System Owner') {
    showToast('error', 'Access restricted: Settings and system configuration are restricted to System Owners.');
    switchTab('dashboard');
    return;
  }

  callApi('apiGetSystemConfig', [], function(res) {
    if (callback) callback();
    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    var cfg = res.data;
    document.getElementById('configSpreadsheetId').textContent = cfg.spreadsheetId || 'Not set';
    document.getElementById('configRootFolderId').textContent = cfg.rootFolderId || 'Not set';

    var tbody = document.getElementById('configUsersTableBody');
    tbody.innerHTML = '';
    if (!cfg.users || cfg.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-slate-500">No authorised users on file.</td></tr>';
    } else {
      cfg.users.forEach(function(u) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td class="p-2.5 font-mono-code text-slate-200">' + escapeHtml(u.email) + '</td>' +
          '<td class="p-2.5 text-[#DFBF7A] font-bold">' + escapeHtml(u.role) + '</td>' +
          '<td class="p-2.5"><span class="chip chip-current">Active</span></td>';
        tbody.appendChild(tr);
      });
    }
  });
}

function triggerSystemSetup() {
  var confirmMsg = 'Run system setup / re-check now?\n\n' +
    'This operation will verify and if missing, create standard spreadsheet sheets (Videos, Units, Design_PDFs, Lists, Audit_Log), ' +
    'set up required folder structures on Google Drive, and initialize baseline configuration properties.\n\n' +
    'Do you authorize executing system setup?';

  if (!confirm(confirmMsg)) {
    return;
  }

  var btn = document.getElementById('btnTriggerSetup');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader-spinner !w-4 !h-4 inline-block mr-2"></div> Running setup…';

  callApi('apiSetupSystem', [{}], function(res) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wrench"></i> <span>Run / Re-check Setup</span>';

    if (!res.ok) {
      showToast('error', res.message);
      return;
    }

    showToast('success', res.data.message || 'Setup completed successfully.');
    loadSettings();
    initApp();
  });
}

// =============================================================
// UNIVERSAL API CALL & FEEDBACK HELPERS
// (callApi is imported directly from ./api/client.js (§14))
// =============================================================

function showToast(type, message) {
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;

  var iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  else if (type === 'error') iconClass = 'fa-circle-exclamation';
  else if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML =
    '<i class="fa-solid ' + iconClass + ' text-base mt-0.5"></i>' +
    '<div class="flex-1 leading-snug">' + escapeHtml(message) + '</div>';

  container.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(function() { toast.remove(); }, 300);
  }, 4500);
}

function showGlobalLoading(message) {
  var overlay = document.getElementById('globalLoadingOverlay');
  var text = document.getElementById('globalLoadingText');
  if (text) text.textContent = message || 'Processing request…';
  if (overlay) overlay.classList.remove('hidden');
}

function hideGlobalLoading() {
  var overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================================
// DOM EVENT DELEGATION FOR ACTIONS (§10)
// =============================================================
document.addEventListener('DOMContentLoaded', function() {
  // Video Library table body delegated actions
  var libBody = document.getElementById('libraryTableBody');
  if (libBody) {
    libBody.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.classList.contains('btn-lib-preview')) {
        var fId = btn.getAttribute('data-file-id');
        var title = btn.getAttribute('data-title');
        openVideoPreviewModal(fId, title);
      } else if (btn.classList.contains('btn-lib-edit-meta')) {
        var vNum = btn.getAttribute('data-video-number');
        var fId = btn.getAttribute('data-file-id');
        openEditVideoMetadataModal(vNum, fId);
      } else if (btn.classList.contains('btn-lib-add-ver')) {
        var vNum = btn.getAttribute('data-video-number');
        openAddVersionModal(vNum);
      } else if (btn.classList.contains('btn-lib-ver-hist')) {
        var vNum = btn.getAttribute('data-video-number');
        openVersionHistoryModal(vNum);
      }
    });
  }

  // Version History modal list delegated actions
  var vhList = document.getElementById('vhVersionsList');
  if (vhList) {
    vhList.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.classList.contains('btn-action-preview')) {
        var fId = btn.getAttribute('data-file-id');
        var title = btn.getAttribute('data-title');
        openVideoPreviewModal(fId, title);
      }
    });
  }

  // Unit Detail modal videos list delegated actions
  var udVids = document.getElementById('udVideosList');
  if (udVids) {
    udVids.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.classList.contains('btn-ud-preview')) {
        var fId = btn.getAttribute('data-file-id');
        var title = btn.getAttribute('data-title');
        openVideoPreviewModal(fId, title);
      } else if (btn.classList.contains('btn-ud-add-ver')) {
        var vNum = btn.getAttribute('data-video-number');
        openAddVersionModal(vNum);
      } else if (btn.classList.contains('btn-ud-ver-hist')) {
        var vNum = btn.getAttribute('data-video-number');
        openVersionHistoryModal(vNum);
      }
    });
  }
});



// Expose functions to window for HTML inline event handlers
window.switchTab = switchTab;
window.reloadCurrentView = reloadCurrentView;
window.openModal = openModal;
window.closeModal = closeModal;
window.openNewUnitModal = openNewUnitModal;
window.handleCreateUnitSubmit = handleCreateUnitSubmit;
window.openAddVersionModal = openAddVersionModal;
window.openEditMetadataModal = openEditMetadataModal;
window.openUnitDetailModal = openUnitDetailModal;
window.handleSingleVideoMetadataSubmit = handleSingleVideoMetadataSubmit;
window.handleAddNewVersionSubmit = handleAddNewVersionSubmit;
window.handleUpdateUnitSubmit = handleUpdateUnitSubmit;
window.handleUploadPdfSubmit = handleUploadPdfSubmit;
window.handleProjectVideoSubmit = handleProjectVideoSubmit;
window.handleMarketingContentSubmit = handleMarketingContentSubmit;
window.handleLibrarySearchInput = handleLibrarySearchInput;
window.handleUnitsSearchInput = handleUnitsSearchInput;
window.applyLibraryFilter = applyLibraryFilter;
window.changeLibraryPage = changeLibraryPage;
window.setAddVideoSource = setAddVideoSource;
window.setAddSource = setAddSource; // alias: HTML onclick="setAddSource(...)" maps to this function
window.triggerPdfFileSelect = triggerPdfFileSelect;
window.handlePdfFileSelected = handlePdfFileSelected;
window.copyToClipboard = copyToClipboard;
window.showToast = showToast;
window.escapeHtml = escapeHtml;

// Missing exports — modal close buttons, pagination, batch rename, unit edit, settings
window.cancelBatchRename = cancelBatchRename;
window.clearDashboardDates = clearDashboardDates;
window.closeAddVersionModal = closeAddVersionModal;
window.closeEditVideoMetadataModal = closeEditVideoMetadataModal;
window.closeNewUnitModal = closeNewUnitModal;
window.closeUnitDetailModal = closeUnitDetailModal;
window.closeUploadPdfModal = closeUploadPdfModal;
window.closeVersionHistoryModal = closeVersionHistoryModal;
window.closeVideoPreviewModal = closeVideoPreviewModal;
window.confirmBatchRename = confirmBatchRename;
window.nextLibraryPage = nextLibraryPage;
window.openUploadPdfModalForCurrentUnit = openUploadPdfModalForCurrentUnit;
window.prevLibraryPage = prevLibraryPage;
window.resetLibraryFilters = resetLibraryFilters;
window.saveUnitMasterEdit = saveUnitMasterEdit;
window.toggleUnitEditMode = toggleUnitEditMode;
window.triggerSystemSetup = triggerSystemSetup;

// Second batch: onchange / oninput / onsubmit handlers (form live previews, filters, submissions)
window.loadDashboard = loadDashboard;
window.submitProjectVideo = submitProjectVideo;
window.toggleUnitMode = toggleUnitMode;
window.filterUnitSearch = filterUnitSearch;
window.updateProjectVideoPreview = updateProjectVideoPreview;
window.filterLocationSearch = filterLocationSearch;
window.submitMarketingContent = submitMarketingContent;
window.updateMarketingContentPreview = updateMarketingContentPreview;
window.handleMarketingContentTypeChange = handleMarketingContentTypeChange;
window.debounceLibrarySearch = debounceLibrarySearch;
window.resetLibraryPageAndLoad = resetLibraryPageAndLoad;
window.changeLibraryPageSize = changeLibraryPageSize;
window.filterUnitsCatalog = filterUnitsCatalog;
window.submitNewUnit = submitNewUnit;
window.submitEditVideoMetadata = submitEditVideoMetadata;
window.updateEditMetaPreview = updateEditMetaPreview;
window.submitAddVersion = submitAddVersion;
window.updateVersionModalPreview = updateVersionModalPreview;
window.submitUploadPdf = submitUploadPdf;

window.handleSignOut = function() {
  signOut();
  window.location.reload();
};
window.requestGoogleSignIn = requestGoogleSignIn;
window.executeAppsScriptApi = executeAppsScriptApi;
window.handleManualClientIdConnect = function() {
  var input = document.getElementById('inputClientId');
  var enteredId = input ? input.value.trim() : '';
  if (!enteredId) {
    showToast('warning', 'Please paste your Google OAuth Client ID.');
    return;
  }

  initGoogleAuth(enteredId, function(user) {
    if (user) {
      var authModal = document.getElementById('authModal');
      if (authModal) authModal.classList.add('hidden');
      var badge = document.getElementById('userEmailBadge');
      if (badge) badge.textContent = user.email;
      initApp();
    }
  });

  var setupBox = document.getElementById('clientSetupContainer');
  if (setupBox) setupBox.classList.add('hidden');
  renderSignInButton('gsiModalButtonContainer');
  requestGoogleSignIn();
};

// Initialise Google Authentication Lifecycle (§8, §14)
function bootAmlaakApplication() {
  if (GOOGLE_CLIENT_ID) {
    initGoogleAuth(GOOGLE_CLIENT_ID, function(user) {
      if (user) {
        var authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.add('hidden');
        var badge = document.getElementById('userEmailBadge');
        if (badge && user.email) badge.textContent = user.email;
        var btnIn = document.getElementById('btnHeaderSignIn');
        if (btnIn) btnIn.classList.add('hidden');
        var btnOut = document.getElementById('btnHeaderSignOut');
        if (btnOut) btnOut.classList.remove('hidden');
        initApp();
      }
    });
  }
  initApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAmlaakApplication);
} else {
  bootAmlaakApplication();
}
