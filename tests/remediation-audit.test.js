/**
 * AMLAAK VIDEO LIBRARY — INDEPENDENT REMEDIATION VERIFICATION AUDIT
 * Verifies all remediation points from the critical review and zero-cost architecture transition.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  [PASSED] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAILED] ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

console.log('======================================================================');
console.log('AMLAAK VIDEO LIBRARY — CRITICAL REMEDIATION AUTOMATED AUDIT');
console.log('======================================================================\n');

const frontendDir = path.resolve(__dirname, '../frontend');
const rootDir = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(frontendDir, 'src/main.js'), 'utf8');
const clientJs = fs.readFileSync(path.join(frontendDir, 'src/api/client.js'), 'utf8');
const authJs = fs.readFileSync(path.join(frontendDir, 'src/auth/google-auth.js'), 'utf8');
const mainCss = fs.readFileSync(path.join(frontendDir, 'src/styles/main.css'), 'utf8');
const appsscriptJson = fs.readFileSync(path.join(rootDir, 'appsscript.json'), 'utf8');
const distAppsscriptJson = fs.readFileSync(path.join(rootDir, 'dist/appsscript.json'), 'utf8');
const dashboardGs = fs.readFileSync(path.join(rootDir, 'DashboardService.gs'), 'utf8');

// 1. Mock Data & Functions Elimination
check('Zero client-side mock store or setupLocalPreviewMocks() in frontend', () => {
  assert(!mainJs.includes('setupLocalPreviewMocks'), 'setupLocalPreviewMocks still present in main.js');
  assert(!mainJs.includes('window._localMockDispatcher'), '_localMockDispatcher still present in main.js');
  assert(!clientJs.includes('_localMockDispatcher'), '_localMockDispatcher still referenced in client.js');
});

check('Zero demo mock records (Ahmed Hassan, Mona Farid) in production frontend bundle', () => {
  assert(!mainJs.includes('Ahmed Hassan'), 'Ahmed Hassan found in main.js');
  assert(!mainJs.includes('Mona Farid'), 'Mona Farid found in main.js');
  assert(!indexHtml.includes('>Ahmed Hassan<'), 'Hardcoded Ahmed Hassan in index.html');
});

check('Zero local demo mode bypass button in auth modal', () => {
  assert(!indexHtml.includes('useLocalDemoMode'), 'useLocalDemoMode button still in index.html');
  assert(!mainJs.includes('window.useLocalDemoMode'), 'useLocalDemoMode still in main.js');
});

// 2. Speculative Backend URL Removal
check('No speculative or dead Cloud Run URL hardcoded in production bundle', () => {
  assert(!clientJs.includes('amlaak-video-backend-preview.run.app'), 'amlaak-video-backend-preview found in client.js');
  assert(!indexHtml.includes('amlaak-video-backend-preview.run.app'), 'amlaak-video-backend-preview found in index.html');
  assert(!mainJs.includes('amlaak-video-backend-preview.run.app'), 'amlaak-video-backend-preview found in main.js');
});

// 3. Pre-auth Privacy & Email Protection
check('Zero pre-authenticated email leaks (louyashra@gmail.com) in HTML', () => {
  assert(!indexHtml.includes('louyashra@gmail.com'), 'Owner email found in index.html');
  assert(!mainJs.includes('louyashra@gmail.com'), 'Owner email found in main.js');
});

// 4. Insecure Token Storage Elimination
check('Tokens must NOT be stored in localStorage (held in memory only)', () => {
  assert(!authJs.includes('localStorage.setItem'), 'localStorage.setItem still found in google-auth.js');
  assert(authJs.includes('localStorage.removeItem'), 'Legacy token cleanup absent in google-auth.js');
});

// 5. Honest Unavailable State & Banner
check('Clear unavailable state banner with correlation code and retry button exists', () => {
  assert(mainJs.includes('renderUnavailableDatabaseState'), 'renderUnavailableDatabaseState function missing');
  assert(mainJs.includes('ERR-CONN-UNAVAILABLE') || mainJs.includes('ERR-CONN-REFUSED'), 'Correlation code missing');
  assert(mainJs.includes('Database Connection Unavailable'), 'Honest unavailable text missing');
  assert(mainJs.includes('Retry Connection'), 'Retry Connection button missing');
  assert(mainJs.includes('<details'), 'Collapsible details tag missing from unavailable banner');
  assert(mainJs.includes('No data available while the database is offline.'), 'Offline breakdown placeholder missing');
});

// 6. UI Repair: Secondary Buttons
check('Clear dates and Reset filters buttons are styled as secondary-btn with min-h-[40px]', () => {
  assert(indexHtml.includes('secondary-btn') && indexHtml.includes('clearDashboardDates()'), 'clearDashboardDates is not secondary-btn');
  assert(indexHtml.includes('secondary-btn') && indexHtml.includes('resetLibraryFilters()'), 'resetLibraryFilters is not secondary-btn');
  assert(mainCss.includes('.secondary-btn'), '.secondary-btn class missing from main.css');
  assert(mainCss.includes('min-height: 40px'), 'min-height: 40px missing from .secondary-btn');
});

// 7. UI Repair: High-Contrast Source Toggle Buttons
check('Source toggle buttons have high-contrast active/inactive styles and ARIA roles', () => {
  assert(indexHtml.includes('toggle-btn-active'), 'toggle-btn-active missing from index.html');
  assert(indexHtml.includes('toggle-btn-inactive'), 'toggle-btn-inactive missing from index.html');
  assert(indexHtml.includes('role="tab"'), 'role="tab" missing from toggle buttons');
  assert(indexHtml.includes('aria-selected'), 'aria-selected missing from toggle buttons');
  assert(mainCss.includes('.toggle-btn-active'), '.toggle-btn-active missing in main.css');
  assert(mainCss.includes('.toggle-btn-inactive'), '.toggle-btn-inactive missing in main.css');
});

// 8. UI Repair: Standardized Action Buttons in Tables with WCAG Touch Targets
check('Action buttons in tables standardized to equal dimensions (>=40px) with ARIA and tooltips', () => {
  assert(mainJs.includes('action-btn-icon'), 'action-btn-icon class missing in main.js table rows');
  assert(mainCss.includes('.action-btn-icon'), '.action-btn-icon class missing in main.css');
  assert(mainCss.includes('min-width: 40px'), 'min-width: 40px missing in .action-btn-icon');
  assert(mainCss.includes('min-height: 40px'), 'min-height: 40px missing in .action-btn-icon');
});

// 9. Accessibility: Skip Navigation Link & Semantics
check('Skip navigation link and semantic <main> landmark are implemented', () => {
  assert(indexHtml.includes('href="#mainContent"'), 'Skip to content link missing');
  assert(indexHtml.includes('Skip to main content'), 'Skip text missing');
  assert(indexHtml.includes('id="mainContent"'), '<main id="mainContent"> landmark missing');
  assert(mainCss.includes('.sr-only'), '.sr-only utility missing in main.css');
});

// 10. Data Adapters Architecture
check('Backend segregates Google APIs and Mock adapters via DATA_ADAPTER injection', () => {
  const sheetsGoogle = fs.existsSync(path.resolve(__dirname, '../backend/src/services/sheets.google.js'));
  const driveGoogle = fs.existsSync(path.resolve(__dirname, '../backend/src/services/drive.google.js'));
  const sheetsMock = fs.existsSync(path.resolve(__dirname, '../backend/src/services/sheets.mock.js'));
  const driveMock = fs.existsSync(path.resolve(__dirname, '../backend/src/services/drive.mock.js'));
  assert(sheetsGoogle, 'sheets.google.js missing');
  assert(driveGoogle, 'drive.google.js missing');
  assert(sheetsMock, 'sheets.mock.js missing');
  assert(driveMock, 'drive.mock.js missing');
});

// 11. Zero-Cost Apps Script Execution API Architecture (§14)
check('Frontend invokes Apps Script Execution API with hardcoded devMode: false', () => {
  assert(clientJs.includes('script.googleapis.com/v1/scripts/'), 'Execution API endpoint missing in client.js');
  assert(clientJs.includes('devMode: false'), 'devMode: false missing in client.js');
  assert(!clientJs.includes('callRest'), 'Dead callRest found in client.js');
  assert(clientJs.includes('executeAppsScriptApi'), 'executeAppsScriptApi function missing in client.js');
});

// 12. Direct Resumable Google Drive PDF Upload (§15)
check('Direct Google Drive resumable upload client is implemented for large PDFs', () => {
  assert(clientJs.includes('uploadPdfDirectToDrive'), 'uploadPdfDirectToDrive missing in client.js');
  assert(clientJs.includes('uploadType=resumable'), 'Resumable upload type missing in client.js');
  assert(mainJs.includes('uploadPdfDirectToDrive'), 'uploadPdfDirectToDrive not wired in main.js');
});

// 13. Apps Script Execution API Manifest Configuration
check('appsscript.json and dist/appsscript.json contain executionApi block', () => {
  assert(appsscriptJson.includes('"executionApi"'), 'executionApi missing from appsscript.json');
  assert(distAppsscriptJson.includes('"executionApi"'), 'executionApi missing from dist/appsscript.json');
});

// 14. Finishing Stage Calculation Excludes Marketing Content (§17)
check('DashboardService.gs restricts finishing stages strictly to Project Videos', () => {
  assert(dashboardGs.includes("Category'] || '').trim() === 'Project Video'"), 'Project Video guard missing in stageDist calculation');
});

// 15. Dashboard Metric Precision Label
check('Dashboard KPI displays Stored PDF versions instead of Archived design plans', () => {
  assert(indexHtml.includes('Stored PDF versions'), 'Stored PDF versions missing in frontend/index.html');
  assert(!indexHtml.includes('Archived design plans'), 'Outdated Archived design plans still in frontend/index.html');
});

console.log('\n======================================================================');
console.log(`REMEDIATION AUDIT SUMMARY: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
}
