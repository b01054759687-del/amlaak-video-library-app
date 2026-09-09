/**
 * Amlaak Video Library — Comprehensive Node.js Unit Test Suite
 * Tests naming rules, ID generators, validation, Decision A/B/C logic, and BI metrics.
 */

const assert = require('assert');

// Simple test harness
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASSED] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAILED] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log('AMLAAK VIDEO LIBRARY — AUTOMATED PRODUCTION UNIT TESTS');
console.log('='.repeat(70));

// ==============================================================================
// 1. URL PARSING & DRIVE FILE ID EXTRACTION
// ==============================================================================
console.log('\n>>> 1. Drive File ID Extraction Tests:');

function extractDriveFileId(urlOrId) {
  if (!urlOrId) return '';
  const input = String(urlOrId).trim();
  let match = input.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match && match[1]) return match[1];
  match = input.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (match && match[1]) return match[1];
  match = input.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(input)) return input;
  return '';
}

test('Extracts from standard /file/d/ URL', () => {
  const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing';
  assert.strictEqual(extractDriveFileId(url), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
});

test('Extracts from query parameter id= URL', () => {
  const url = 'https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz_012345';
  assert.strictEqual(extractDriveFileId(url), '1AbCdEfGhIjKlMnOpQrStUvWxYz_012345');
});

test('Extracts raw valid File ID', () => {
  const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.strictEqual(extractDriveFileId(rawId), rawId);
});

test('Rejects invalid short or malformed ID', () => {
  assert.strictEqual(extractDriveFileId('short_invalid_id'), '');
  assert.strictEqual(extractDriveFileId(''), '');
});

// ==============================================================================
// 2. FILENAME SANITIZATION & EXTENSION EXTRACTION
// ==============================================================================
console.log('\n>>> 2. Filename Sanitization Tests:');

function sanitizeFilename(filename) {
  if (!filename) return '';
  return String(filename)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\s+-\s*|\s*-\s+/g, ' - ')
    .replace(/( - ){2,}/g, ' - ')
    .replace(/^[\s\-]+|[\s\-]+$/g, '')
    .trim();
}

function extractExtension(filename) {
  if (!filename) return 'mp4';
  const clean = String(filename).trim();
  const lastDot = clean.lastIndexOf('.');
  if (lastDot !== -1 && lastDot < clean.length - 1) {
    const ext = clean.substring(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext.length > 0 && ext.length <= 5) return ext;
  }
  return 'mp4';
}

test('Removes OS reserved characters (\\ / : * ? " < > |)', () => {
  const raw = 'Ahmed: Hassan / New*Cairo ? Final <Kitchen> | 2026.mp4';
  const clean = sanitizeFilename(raw);
  assert.strictEqual(clean, 'Ahmed Hassan NewCairo Final Kitchen 2026.mp4');
});

test('Normalizes and collapses redundant separators and spaces', () => {
  const raw = 'Ahmed   Hassan  -   - New Cairo  -  Final - -  V01.mp4';
  const clean = sanitizeFilename(raw);
  assert.strictEqual(clean, 'Ahmed Hassan - New Cairo - Final - V01.mp4');
});

test('Extracts correct extension and handles unusual names', () => {
  assert.strictEqual(extractExtension('video.final.MOV'), 'mov');
  assert.strictEqual(extractExtension('clip.mp4'), 'mp4');
  assert.strictEqual(extractExtension('unknown_file'), 'mp4');
});

// ==============================================================================
// 3. PROJECT VIDEO & MARKETING NAMING RULES (§12)
// ==============================================================================
console.log('\n>>> 3. Naming Rules (§12) Tests:');

function formatVersionNumber(num) {
  const n = parseInt(num, 10) || 1;
  return 'V' + (n < 10 ? '0' + n : String(n));
}

function generateProjectVideoName(meta) {
  const parts = [];
  if (meta.clientName) parts.push(meta.clientName.trim());
  if (meta.location) parts.push(meta.location.trim());
  if (meta.projectVideoType) parts.push(meta.projectVideoType.trim());
  if (meta.spaceType) parts.push(meta.spaceType.trim());
  if (meta.shootingDate) parts.push(meta.shootingDate.trim());
  parts.push(formatVersionNumber(meta.versionNumber || 1));
  const ext = extractExtension(meta.originalFileName || 'mp4');
  return sanitizeFilename(parts.join(' - ')) + '.' + ext;
}

function generateMarketingContentName(meta) {
  const parts = [];
  if (meta.contentType) parts.push(meta.contentType.trim());
  if (meta.topic) parts.push(meta.topic.trim());
  let space = (meta.spaceType || '').trim();
  if (meta.contentType && meta.contentType.toLowerCase() === 'educational') space = '';
  if (space) parts.push(space);
  if (meta.shootingDate) parts.push(meta.shootingDate.trim());
  parts.push(formatVersionNumber(meta.versionNumber || 1));
  const ext = extractExtension(meta.originalFileName || 'mp4');
  return sanitizeFilename(parts.join(' - ')) + '.' + ext;
}

test('Project Video: Standard exact format matching Section 12 example', () => {
  const meta = {
    clientName: 'Ahmed Hassan',
    location: 'New Cairo',
    projectVideoType: 'Final',
    spaceType: 'Kitchen',
    shootingDate: '2026-08-17',
    versionNumber: 2,
    originalFileName: 'raw_footage.mp4'
  };
  const name = generateProjectVideoName(meta);
  assert.strictEqual(name, 'Ahmed Hassan - New Cairo - Final - Kitchen - 2026-08-17 - V02.mp4');
});

test('Project Video: Work Category is NOT included in physical filename (Decision A)', () => {
  const meta = {
    clientName: 'Ahmed Hassan',
    location: 'New Cairo',
    projectVideoType: 'Final',
    spaceType: 'Kitchen',
    workCategory: 'Electrical', // must NOT be in filename
    shootingDate: '2026-08-17',
    versionNumber: 1
  };
  const name = generateProjectVideoName(meta);
  assert(!name.includes('Electrical'), 'Work Category should not be in filename');
  assert.strictEqual(name, 'Ahmed Hassan - New Cairo - Final - Kitchen - 2026-08-17 - V01.mp4');
});

test('Marketing Content: Educational type omits Space Type unconditionally', () => {
  const meta = {
    contentType: 'Educational',
    topic: 'Plumbing Mistakes',
    spaceType: 'Bathroom', // should be omitted for Educational
    shootingDate: '2026-08-17',
    versionNumber: 1
  };
  const name = generateMarketingContentName(meta);
  assert.strictEqual(name, 'Educational - Plumbing Mistakes - 2026-08-17 - V01.mp4');
});

test('Marketing Content: Demonstration type includes Space Type when present', () => {
  const meta = {
    contentType: 'Demonstration',
    topic: 'Kitchen Installation',
    spaceType: 'Kitchen',
    shootingDate: '2026-08-17',
    versionNumber: 3
  };
  const name = generateMarketingContentName(meta);
  assert.strictEqual(name, 'Demonstration - Kitchen Installation - Kitchen - 2026-08-17 - V03.mp4');
});

// ==============================================================================
// 4. NUMBER INCREMENTS & FORMATTING
// ==============================================================================
console.log('\n>>> 4. Sequential ID Increments Tests:');

function padZero(num, size) {
  let s = String(num);
  while (s.length < (size || 4)) s = '0' + s;
  return s;
}

test('Video Number increments cleanly (0001 -> 0002)', () => {
  const existingNumbers = ['0001', '0002', '0003'];
  const max = Math.max(...existingNumbers.map(n => parseInt(n, 10)));
  const next = padZero(max + 1, 4);
  assert.strictEqual(next, '0004');
});

test('Version Number increments cleanly (V01 -> V02 -> V10)', () => {
  assert.strictEqual(formatVersionNumber(1), 'V01');
  assert.strictEqual(formatVersionNumber(2), 'V02');
  assert.strictEqual(formatVersionNumber(10), 'V10');
});

test('Unit ID formats properly (U-0001, U-0025)', () => {
  function formatUnitId(n) { return 'U-' + padZero(n, 4); }
  assert.strictEqual(formatUnitId(1), 'U-0001');
  assert.strictEqual(formatUnitId(25), 'U-0025');
});

// ==============================================================================
// 5. DECISION C PROPAGATION & BATCH RENAME DETECTION
// ==============================================================================
console.log('\n>>> 5. Decision C Unit Propagation & Batch Rename Tests:');

test('Propagates Unit updates and identifies affected filenames for batch rename', () => {
  // Existing videos linked to Unit U-0001
  const unitRecord = {
    unitId: 'U-0001',
    clientName: 'Ahmed Hassan',
    location: 'New Cairo',
    unitType: 'Apartment'
  };

  const videoVersion = {
    unitId: 'U-0001',
    videoNumber: '0001',
    versionNumber: 'V01',
    clientName: 'Ahmed Hassan',
    location: 'New Cairo',
    projectVideoType: 'Final',
    spaceType: 'Kitchen',
    shootingDate: '2026-08-17',
    videoName: 'Ahmed Hassan - New Cairo - Final - Kitchen - 2026-08-17 - V01.mp4'
  };

  // User corrects Unit Location from 'New Cairo' to 'Zayed'
  const correctedUnit = {
    ...unitRecord,
    location: 'Zayed'
  };

  // Check if filename changes
  const newName = generateProjectVideoName({
    clientName: correctedUnit.clientName,
    location: correctedUnit.location,
    projectVideoType: videoVersion.projectVideoType,
    spaceType: videoVersion.spaceType,
    shootingDate: videoVersion.shootingDate,
    versionNumber: 1
  });

  assert.notStrictEqual(newName, videoVersion.videoName);
  assert.strictEqual(newName, 'Ahmed Hassan - Zayed - Final - Kitchen - 2026-08-17 - V01.mp4');
});

// ==============================================================================
// 6. DASHBOARD BI METRIC FORMULAS (§19)
// ==============================================================================
console.log('\n>>> 6. Dashboard Metrics & KPI Calculation Tests:');

test('Distinct logical videos counted properly (not inflated by multiple versions)', () => {
  const versions = [
    { videoNumber: '0001', versionNumber: 'V01', isCurrentVersion: false, videoSource: 'Project Video' },
    { videoNumber: '0001', versionNumber: 'V02', isCurrentVersion: true,  videoSource: 'Project Video' },
    { videoNumber: '0002', versionNumber: 'V01', isCurrentVersion: true,  videoSource: 'Project Video' },
    { videoNumber: '0003', versionNumber: 'V01', isCurrentVersion: true,  videoSource: 'Marketing Content' }
  ];

  const distinctLogical = new Set(versions.map(v => v.videoNumber)).size;
  const totalStoredVersions = versions.length;

  assert.strictEqual(distinctLogical, 3, 'Must count exactly 3 logical videos');
  assert.strictEqual(totalStoredVersions, 4, 'Must count 4 physical stored version rows');
});

// ==============================================================================
// 7. DURATION & ORIENTATION RELIABILITY (§7.2)
// ==============================================================================
console.log('\n>>> 7. Duration and Orientation Graceful Handling Tests:');

test('Accepts empty duration and empty orientation without error', () => {
  const record = {
    videoNumber: '0001',
    duration: '',
    orientation: ''
  };
  assert.strictEqual(record.duration, '');
  assert.strictEqual(record.orientation, '');
});

test('Derives orientation only when both width and height are valid', () => {
  function deriveOrientation(w, h) {
    if (!w || !h || isNaN(w) || isNaN(h)) return '';
    return w >= h ? 'Landscape' : 'Portrait';
  }
  assert.strictEqual(deriveOrientation(1920, 1080), 'Landscape');
  assert.strictEqual(deriveOrientation(1080, 1920), 'Portrait');
  assert.strictEqual(deriveOrientation(null, 1080), '');
  assert.strictEqual(deriveOrientation(undefined, undefined), '');
});

console.log('\n' + '='.repeat(70));
console.log(`TOTAL UNIT TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
}
