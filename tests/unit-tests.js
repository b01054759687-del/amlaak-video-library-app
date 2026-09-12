/**
 * Amlaak Video Library — Comprehensive Node.js Unit Test Suite
 * Tests naming rules, ID generators, validation, Decision A/B/C logic, and BI metrics.
 */

const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');

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

// ==============================================================================
// 8. BOOTSTRAP API CONTRACT & SECURITY TESTS (§6)
// ==============================================================================
console.log('\n>>> 8. Bootstrap API Contract & Security Tests:');

test('Bootstrap payload contains exact required contract and safe summary data', () => {
  function simulateBootstrap(user) {
    if (!user || !user.isAuthorized) {
      return { ok: false, errorCode: 'AUTH_REQUIRED', message: 'Unauthorized session.' };
    }
    return {
      ok: true,
      data: {
        user: { email: user.email, role: user.role, isAuthorized: true },
        lists: {
          unitType: ['Apartment'],
          workCategory: ['Ceramics', 'Roof']
        },
        isConfigured: true,
        dashboard: {
          kpis: { totalLogicalVideos: 10, totalStoredVersions: 15 },
          breakdowns: { workCategories: [{ name: 'Ceramics', count: 5 }] }
        },
        unitLookups: [
          { unitId: 'U-0001', clientName: 'Ahmed', location: 'New Cairo', unitType: 'Apartment', area: 200 }
        ],
        config: { spreadsheetId: 'test-ss-id', rootFolderId: 'test-folder-id' }
      }
    };
  }

  const res = simulateBootstrap({ email: 'louyashra@gmail.com', role: 'System Owner', isAuthorized: true });
  assert.strictEqual(res.ok, true);
  assert.ok(res.data.user);
  assert.strictEqual(res.data.user.email, 'louyashra@gmail.com');
  assert.ok(res.data.dashboard);
  assert.ok(Array.isArray(res.data.unitLookups));
  assert.strictEqual(res.data.unitLookups[0].unitId, 'U-0001');

  // Verify NO sensitive fields leaked
  assert.strictEqual(res.data.allowlist, undefined, 'Must not expose authorized-user allowlist');
  assert.strictEqual(res.data.scriptProperties, undefined, 'Must not expose Script Properties');
  assert.strictEqual(res.data.oauthTokens, undefined, 'Must not expose OAuth information');
  assert.strictEqual(res.data.allDriveFiles, undefined, 'Must not dump all Drive files in bootstrap');
});

test('Unauthorized bootstrap request is rejected cleanly without stack traces', () => {
  function simulateBootstrap(user) {
    if (!user || !user.isAuthorized) {
      return { ok: false, errorCode: 'AUTH_REQUIRED', message: 'Unauthorized session.' };
    }
    return { ok: true, data: {} };
  }

  const res = simulateBootstrap({ email: 'intruder@unknown.com', isAuthorized: false });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.errorCode, 'AUTH_REQUIRED');
  assert.strictEqual(typeof res.message, 'string');
  assert.strictEqual(res.stack, undefined, 'Must not expose raw stack trace');
});

// ==============================================================================
// 9. WORK CATEGORY COMPREHENSIVE POLICY TESTS (Decision A, §2.1 & §7)
// ==============================================================================
console.log('\n>>> 9. Work Category Comprehensive Policy Tests:');

const APPROVED_WORK_CATEGORIES = [
  'Roof', 'Ceiling', 'Materials', 'Furniture', 'Decoration',
  'HDF', 'Ceramics', 'Electrical', 'Gypsum Board', 'Air Conditioning',
  'Sound System', 'Doors', 'Windows', 'Painting', 'Plastering'
];

test('Accepts all 15 approved English Work Category values', () => {
  assert.strictEqual(APPROVED_WORK_CATEGORIES.length, 15);
  APPROVED_WORK_CATEGORIES.forEach(cat => {
    assert.ok(typeof cat === 'string' && cat.length > 0);
  });
});

test('Rejects invalid Work Category values in validation', () => {
  function validateWorkCategory(val) {
    if (!val || APPROVED_WORK_CATEGORIES.indexOf(val) === -1) {
      return { isValid: false, message: 'Invalid work category' };
    }
    return { isValid: true };
  }

  assert.strictEqual(validateWorkCategory('Ceramics').isValid, true);
  assert.strictEqual(validateWorkCategory('Roof').isValid, true);
  assert.strictEqual(validateWorkCategory('Plumbing_Invalid').isValid, false);
  assert.strictEqual(validateWorkCategory('').isValid, false);
});

test('Work Category is completely independent from Space Type', () => {
  const projectVideo = {
    spaceType: 'Kitchen',
    workCategory: 'Ceramics'
  };
  assert.notStrictEqual(projectVideo.spaceType, projectVideo.workCategory);
  assert.strictEqual(projectVideo.spaceType, 'Kitchen');
  assert.strictEqual(projectVideo.workCategory, 'Ceramics');
});

test('Work Category is automatically cleared for Marketing Content', () => {
  function prepareRecord(source, payload) {
    return {
      videoSource: source,
      workCategory: source === 'Project Video' ? (payload.workCategory || '') : ''
    };
  }

  const mkt = prepareRecord('Marketing Content', { workCategory: 'Ceramics' });
  assert.strictEqual(mkt.workCategory, '', 'Marketing Content must never have a Work Category');

  const proj = prepareRecord('Project Video', { workCategory: 'Ceramics' });
  assert.strictEqual(proj.workCategory, 'Ceramics', 'Project Video preserves Work Category');
});

test('Work Category is copied to new versions if not overridden', () => {
  const baseVersion = { videoNumber: '0001', versionNumber: 'V01', workCategory: 'Gypsum Board' };
  const newPayload = {}; // no work category specified in new version payload
  const nextWorkCat = newPayload.workCategory || baseVersion.workCategory || '';
  assert.strictEqual(nextWorkCat, 'Gypsum Board');
});

test('Existing legacy rows with empty Work Category are supported without error', () => {
  const legacyRow = {
    'Video Number': '0001',
    'Video Name': 'Ahmed Hassan - New Cairo - Final - Kitchen - 2026-08-17 - V01.mp4',
    'Work Category': ''
  };
  assert.strictEqual(legacyRow['Work Category'] || '', '');
});

test('Work Category is strictly excluded from physical video filenames', () => {
  function generateProjectVideoName(p) {
    const ext = p.extension || 'mp4';
    const vStr = typeof p.versionNumber === 'number' ? `V${String(p.versionNumber).padStart(2, '0')}` : p.versionNumber;
    return `${p.clientName} - ${p.location} - ${p.projectVideoType} - ${p.spaceType} - ${p.shootingDate} - ${vStr}.${ext}`;
  }

  const name = generateProjectVideoName({
    clientName: 'Ahmed Hassan',
    location: 'New Cairo',
    projectVideoType: 'Final',
    spaceType: 'Kitchen',
    workCategory: 'Ceramics', // Must NOT be in the filename
    shootingDate: '2026-08-17',
    versionNumber: 1
  });

  assert.strictEqual(name, 'Ahmed Hassan - New Cairo - Final - Kitchen - 2026-08-17 - V01.mp4');
  assert.strictEqual(name.includes('Ceramics'), false, 'Work Category must NOT appear in filename');
});

test('Video Library and Dashboard filter and group correctly by Work Category', () => {
  const rows = [
    { videoNumber: '0001', isCurrentVersion: true, workCategory: 'Ceramics' },
    { videoNumber: '0002', isCurrentVersion: true, workCategory: 'Electrical' },
    { videoNumber: '0003', isCurrentVersion: true, workCategory: 'Ceramics' }
  ];

  // Filtering
  const filtered = rows.filter(r => r.workCategory === 'Ceramics');
  assert.strictEqual(filtered.length, 2);

  // Grouping
  const grouping = {};
  rows.forEach(r => {
    grouping[r.workCategory] = (grouping[r.workCategory] || 0) + 1;
  });
  assert.strictEqual(grouping['Ceramics'], 2);
  assert.strictEqual(grouping['Electrical'], 1);
});

// ==============================================================================
// 10. PDF VERSION HISTORY STRICT INVARIANT TESTS (Decision B, §2.2 & §8)
// ==============================================================================
console.log('\n>>> 10. PDF Version History Strict Invariant Tests:');

test('First PDF becomes V01 and Current', () => {
  const unitPdfs = [];
  function addPdf(docTitle, driveFileId) {
    const nextVer = unitPdfs.length + 1;
    const verStr = `V${String(nextVer).padStart(2, '0')}`;
    // flip previous
    unitPdfs.forEach(p => { p.isCurrentVersion = false; });
    const record = {
      pdfRecordId: `U-0001-PDF-${String(nextVer).padStart(2, '0')}`,
      pdfVersionNumber: verStr,
      isCurrentVersion: true,
      documentTitle: docTitle,
      driveFileId: driveFileId
    };
    unitPdfs.push(record);
    return record;
  }

  const pdf1 = addPdf('Lighting Plan', 'drive-id-1');
  assert.strictEqual(pdf1.pdfVersionNumber, 'V01');
  assert.strictEqual(pdf1.isCurrentVersion, true);
  assert.strictEqual(unitPdfs.length, 1);
});

test('Second PDF becomes V02 and Current, while V01 flips to Previous', () => {
  const unitPdfs = [
    { pdfRecordId: 'U-0001-PDF-01', pdfVersionNumber: 'V01', isCurrentVersion: true, driveFileId: 'drive-id-1' }
  ];

  function addPdf(docTitle, driveFileId) {
    const nextVer = unitPdfs.length + 1;
    const verStr = `V${String(nextVer).padStart(2, '0')}`;
    unitPdfs.forEach(p => { p.isCurrentVersion = false; });
    const record = {
      pdfRecordId: `U-0001-PDF-${String(nextVer).padStart(2, '0')}`,
      pdfVersionNumber: verStr,
      isCurrentVersion: true,
      documentTitle: docTitle,
      driveFileId: driveFileId
    };
    unitPdfs.push(record);
    return record;
  }

  const pdf2 = addPdf('Updated Lighting Plan', 'drive-id-2');
  assert.strictEqual(pdf2.pdfVersionNumber, 'V02');
  assert.strictEqual(pdf2.isCurrentVersion, true);

  // V01 must now be Previous (false)
  const pdf1 = unitPdfs.find(p => p.pdfVersionNumber === 'V01');
  assert.strictEqual(pdf1.isCurrentVersion, false);

  // Exactly one Current version remains
  const currentPdfs = unitPdfs.filter(p => p.isCurrentVersion);
  assert.strictEqual(currentPdfs.length, 1);
});

test('Rejects duplicate Drive File ID across PDFs', () => {
  const existingPdfs = [{ driveFileId: 'unique-drive-id-1' }];
  function validateDuplicate(fileId) {
    if (existingPdfs.some(p => p.driveFileId === fileId)) {
      throw new Error('DUPLICATE_DRIVE_ID');
    }
  }

  assert.throws(() => validateDuplicate('unique-drive-id-1'), /DUPLICATE_DRIVE_ID/);
  assert.doesNotThrow(() => validateDuplicate('fresh-drive-id-2'));
});

test('Rejects non-PDF MIME type and missing Unit ID', () => {
  function validatePdfUpload(p) {
    if (!p.unitId) return { isValid: false, error: 'MISSING_UNIT_ID' };
    const ext = (p.fileName || '').split('.').pop().toLowerCase();
    if (ext !== 'pdf') return { isValid: false, error: 'INVALID_EXTENSION' };
    return { isValid: true };
  }

  assert.strictEqual(validatePdfUpload({ unitId: 'U-0001', fileName: 'plan.pdf' }).isValid, true);
  assert.strictEqual(validatePdfUpload({ unitId: '', fileName: 'plan.pdf' }).error, 'MISSING_UNIT_ID');
  assert.strictEqual(validatePdfUpload({ unitId: 'U-0001', fileName: 'plan.docx' }).error, 'INVALID_EXTENSION');
});

// ==============================================================================
// 11. STAGE 2.5 FRONTEND WORKFLOW & SECURITY REGRESSION TESTS
// ==============================================================================
console.log('\n>>> 11. Stage 2.5 Frontend Workflow & Security Tests:');

test('New Unit workflow: Validates Client Name, Location, Unit Type and Area', () => {
  function validateNewUnitPayload(p) {
    if (!p.clientName || !p.clientName.trim()) return { isValid: false, error: 'CLIENT_NAME_REQUIRED' };
    if (!p.location || !p.location.trim()) return { isValid: false, error: 'LOCATION_REQUIRED' };
    if (!p.unitType || !p.unitType.trim()) return { isValid: false, error: 'UNIT_TYPE_REQUIRED' };
    if (p.area !== undefined && p.area !== '' && (isNaN(p.area) || Number(p.area) <= 0)) {
      return { isValid: false, error: 'INVALID_AREA' };
    }
    return { isValid: true };
  }

  assert.strictEqual(validateNewUnitPayload({ clientName: 'Eng. Tarek', location: 'New Cairo', unitType: 'Apartment', area: 250 }).isValid, true);
  assert.strictEqual(validateNewUnitPayload({ clientName: '', location: 'New Cairo', unitType: 'Apartment' }).error, 'CLIENT_NAME_REQUIRED');
  assert.strictEqual(validateNewUnitPayload({ clientName: 'Eng. Tarek', location: '', unitType: 'Apartment' }).error, 'LOCATION_REQUIRED');
  assert.strictEqual(validateNewUnitPayload({ clientName: 'Eng. Tarek', location: 'New Cairo', unitType: '' }).error, 'UNIT_TYPE_REQUIRED');
  assert.strictEqual(validateNewUnitPayload({ clientName: 'Eng. Tarek', location: 'New Cairo', unitType: 'Apartment', area: -10 }).error, 'INVALID_AREA');
});

test('Video Version History: Correct sorting descending and single current version invariant', () => {
  const versions = [
    { versionNumber: 'V01', isCurrentVersion: false },
    { versionNumber: 'V03', isCurrentVersion: true },
    { versionNumber: 'V02', isCurrentVersion: false }
  ];

  // Sort descending
  versions.sort((a, b) => {
    const vA = parseInt(String(a.versionNumber).replace(/\D/g, ''), 10) || 0;
    const vB = parseInt(String(b.versionNumber).replace(/\D/g, ''), 10) || 0;
    return vB - vA;
  });

  assert.strictEqual(versions[0].versionNumber, 'V03');
  assert.strictEqual(versions[1].versionNumber, 'V02');
  assert.strictEqual(versions[2].versionNumber, 'V01');

  // Single current version invariant
  const currentCount = versions.filter(v => v.isCurrentVersion).length;
  assert.strictEqual(currentCount, 1);
});

test('Add Version from Unit Details: Fallback resolution when Library array is empty', () => {
  const activeUnitDetail = {
    unit: { clientName: 'Hassan Allam', location: 'Sheikh Zayed' },
    videos: [
      {
        videoNumber: '0005',
        projectVideoType: 'Phase 1',
        spaceType: 'Reception',
        currentVersion: { versionNumber: 'V02', videoName: 'Hassan Allam - Sheikh Zayed - Phase 1 - Reception - 2026-08-01 - V02.mp4' }
      }
    ]
  };
  const appStateAllVideos = []; // Empty library

  function resolveVideoForAddVersion(vNum) {
    let match = appStateAllVideos.find(v => v.videoNumber === vNum);
    if (!match && activeUnitDetail && activeUnitDetail.videos) {
      const uVid = activeUnitDetail.videos.find(uv => uv.videoNumber === vNum);
      if (uVid) {
        match = {
          videoNumber: uVid.videoNumber,
          clientName: activeUnitDetail.unit.clientName,
          location: activeUnitDetail.unit.location,
          projectVideoType: uVid.projectVideoType,
          spaceType: uVid.spaceType,
          versionNumber: uVid.currentVersion.versionNumber
        };
      }
    }
    return match;
  }

  const resolved = resolveVideoForAddVersion('0005');
  assert.ok(resolved, 'Video must resolve from Unit Details even when allVideos is empty');
  assert.strictEqual(resolved.clientName, 'Hassan Allam');
  assert.strictEqual(resolved.versionNumber, 'V02');
});

test('Edit Metadata: Proposed filename calculation and Drive rename confirmation requirement', () => {
  const existingVideo = {
    videoSource: 'Project Video',
    clientName: 'Nour Design',
    location: 'New Cairo',
    projectVideoType: 'Final',
    spaceType: 'Bathroom',
    workCategory: 'Ceramics',
    shootingDate: '2026-08-10',
    versionNumber: 'V01',
    videoName: 'Nour Design - New Cairo - Final - Bathroom - 2026-08-10 - V01.mp4'
  };

  function computeProposed(existing, newFields) {
    const parts = [
      existing.clientName,
      existing.location,
      existing.projectVideoType,
      newFields.spaceType || existing.spaceType,
      newFields.shootingDate || existing.shootingDate,
      existing.versionNumber
    ];
    return parts.join(' - ') + '.mp4';
  }

  // Same metadata -> no rename required
  const sameName = computeProposed(existingVideo, { spaceType: 'Bathroom', shootingDate: '2026-08-10' });
  assert.strictEqual(sameName, existingVideo.videoName);
  assert.strictEqual(sameName !== existingVideo.videoName, false);

  // Changed spaceType -> requires confirmation
  const changedName = computeProposed(existingVideo, { spaceType: 'Kitchen', shootingDate: '2026-08-10' });
  assert.strictEqual(changedName, 'Nour Design - New Cairo - Final - Kitchen - 2026-08-10 - V01.mp4');
  assert.strictEqual(changedName !== existingVideo.videoName, true);
});

test('Video Preview: Validates Drive File ID regex and blocks malicious URLs', () => {
  const validFileId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  const invalidId1 = 'javascript:alert(1)';
  const invalidId2 = '<script>evil()</script>';
  const invalidId3 = 'short_id_123';

  function isValidDriveId(id) {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]{20,}$/.test(id);
  }

  assert.strictEqual(isValidDriveId(validFileId), true);
  assert.strictEqual(isValidDriveId(invalidId1), false);
  assert.strictEqual(isValidDriveId(invalidId2), false);
  assert.strictEqual(isValidDriveId(invalidId3), false);

  function buildSafePreviewUrl(id) {
    if (!isValidDriveId(id)) throw new Error('INVALID_DRIVE_ID');
    return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview';
  }

  assert.strictEqual(buildSafePreviewUrl(validFileId), 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview');
  assert.throws(() => buildSafePreviewUrl(invalidId1), /INVALID_DRIVE_ID/);
});

test('Pagination: Computes totalPages, slice boundaries and hasMore correctly', () => {
  const items = Array.from({ length: 57 }, (_, i) => ({ id: i + 1 }));
  const pageSize = 25;

  function paginate(arr, page, size) {
    const totalCount = arr.length;
    const totalPages = Math.ceil(totalCount / size) || 1;
    const startIndex = (page - 1) * size;
    const pageItems = arr.slice(startIndex, startIndex + size);
    const hasMore = (startIndex + size) < totalCount;
    return { page, pageSize: size, totalCount, totalPages, hasMore, count: pageItems.length };
  }

  const p1 = paginate(items, 1, pageSize);
  assert.strictEqual(p1.count, 25);
  assert.strictEqual(p1.totalPages, 3);
  assert.strictEqual(p1.hasMore, true);

  const p2 = paginate(items, 2, pageSize);
  assert.strictEqual(p2.count, 25);
  assert.strictEqual(p2.hasMore, true);

  const p3 = paginate(items, 3, pageSize);
  assert.strictEqual(p3.count, 7);
  assert.strictEqual(p3.hasMore, false);
});

test('Unit Selection Integrity: Switching between Existing and New modes resets state', () => {
  let formState = {
    selectedUnitId: 'U-0001',
    clientName: 'Aly Ezzat',
    location: 'Katameya Dunes',
    unitType: 'Villa',
    area: 450,
    isLocked: true
  };

  // Simulate toggleUnitMode('new')
  function resetToNewUnitMode(state) {
    return {
      selectedUnitId: '',
      clientName: '',
      location: '',
      unitType: '',
      area: '',
      isLocked: false
    };
  }

  const newState = resetToNewUnitMode(formState);
  assert.strictEqual(newState.selectedUnitId, '');
  assert.strictEqual(newState.clientName, '');
  assert.strictEqual(newState.isLocked, false);
});

test('PDF Upload Hardening: Size check (25MB limit), extension check and failure resilience', () => {
  const MAX_SIZE = 25 * 1024 * 1024;

  function validatePdfFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return { ok: false, error: 'INVALID_EXTENSION' };
    }
    if (file.size > MAX_SIZE) {
      return { ok: false, error: 'SIZE_EXCEEDED' };
    }
    return { ok: true };
  }

  assert.strictEqual(validatePdfFile({ name: 'contract.pdf', size: 10 * 1024 * 1024 }).ok, true);
  assert.strictEqual(validatePdfFile({ name: 'huge.pdf', size: 26 * 1024 * 1024 }).error, 'SIZE_EXCEEDED');
  assert.strictEqual(validatePdfFile({ name: 'file.exe', size: 1024 }).error, 'INVALID_EXTENSION');
});

test('Asynchronous Response Protection: Discards stale out-of-order search responses', () => {
  let currentRequestId = 0;
  let activeRenderedData = null;

  function startRequest() {
    return ++currentRequestId;
  }

  function handleResponse(reqId, data) {
    if (reqId !== currentRequestId) {
      return false; // Discarded!
    }
    activeRenderedData = data;
    return true; // Applied
  }

  const req1 = startRequest(); // 1
  const req2 = startRequest(); // 2

  // Simulate req2 returning first
  const handled2 = handleResponse(req2, 'Data from Request 2');
  assert.strictEqual(handled2, true);
  assert.strictEqual(activeRenderedData, 'Data from Request 2');

  // Simulate req1 returning late
  const handled1 = handleResponse(req1, 'Stale Data from Request 1');
  assert.strictEqual(handled1, false);
  assert.strictEqual(activeRenderedData, 'Data from Request 2'); // Preserved!
});

test('Settings Protection: Owner role strictly required for setup and config', () => {
  function checkOwnerAuth(user) {
    if (!user || user.role !== 'System Owner') {
      throw new Error('UNAUTHORIZED_SETTINGS_ACCESS');
    }
    return true;
  }

  assert.doesNotThrow(() => checkOwnerAuth({ email: 'louyashra@gmail.com', role: 'System Owner' }));
  assert.throws(() => checkOwnerAuth({ email: 'viewer@amlaak.com', role: 'Authorised User' }), /UNAUTHORIZED_SETTINGS_ACCESS/);
  assert.throws(() => checkOwnerAuth(null), /UNAUTHORIZED_SETTINGS_ACCESS/);
});

test('HTML Sanitization: Prevents XSS injection via escapeHtml', () => {
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const payload = '<script>alert("xss")</script>&"test"';
  const escaped = escapeHtml(payload);
  assert.strictEqual(escaped.includes('<script>'), false);
  assert.strictEqual(escaped.includes('&lt;script&gt;'), true);
  assert.strictEqual(escaped.includes('&quot;'), true);
});

test('Accessibility Invariants: Index.html contains ARIA modal dialogs and no user-scalable=no', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  assert.strictEqual(indexHtml.includes('user-scalable=no'), false, 'user-scalable=no must not exist');
  assert.ok(indexHtml.includes('id="modalNewUnit" role="dialog" aria-modal="true"'));
  assert.ok(indexHtml.includes('id="modalVideoPreview" role="dialog" aria-modal="true"'));
  assert.ok(indexHtml.includes('id="modalEditVideoMetadata" role="dialog" aria-modal="true"'));
});

// ==============================================================================
// 12. Apps Script Manifest — GitHub Pages Shared-Code Gateway Access Model
// ==============================================================================
// This branch (feat/github-pages-shared-code-production) deliberately runs a
// DIFFERENT access model than the original Apps Script HTML UI: the GitHub
// Pages frontend cannot carry a Google session with it, so the backend must
// accept anonymous requests (ANYONE_ANONYMOUS / USER_DEPLOYING) and enforce
// authorisation itself via the shared-code session gateway (Gateway.gs +
// GatewaySession.gs) instead of Google identity. This is an intentional,
// reviewed architecture decision, not the same regression the manifest tests
// previously guarded against — see Section 18 for the compensating tests
// that verify the gateway itself cannot be bypassed.
console.log('\n>>> 12. Apps Script Manifest Tests:');

test('Manifest: webapp.access is ANYONE_ANONYMOUS and executeAs is USER_DEPLOYING (shared-code gateway model)', () => {
  const manifest = JSON.parse(fs.readFileSync('appsscript.json', 'utf8'));
  assert.strictEqual(manifest.webapp.access, 'ANYONE_ANONYMOUS', 'the GitHub Pages frontend cannot carry a Google session, so the backend must accept anonymous requests and gate them itself');
  assert.strictEqual(manifest.webapp.executeAs, 'USER_DEPLOYING', 'with no accessing identity, the script must run as the deploying owner for every request');
});

test('Manifest: no executionApi block exists (deprecated Execution API architecture)', () => {
  const manifest = JSON.parse(fs.readFileSync('appsscript.json', 'utf8'));
  assert.strictEqual(manifest.executionApi, undefined, 'executionApi must not be configured');
});

test('Manifest: built dist/appsscript.json matches the root deployment configuration exactly', () => {
  const rootManifest = fs.readFileSync('appsscript.json', 'utf8');
  const distManifest = fs.readFileSync('dist/appsscript.json', 'utf8');
  assert.strictEqual(distManifest, rootManifest, 'dist/appsscript.json must be byte-identical to the root manifest');
});

// ==============================================================================
// 13. Server Gateway Authorisation Audit
// ==============================================================================
console.log('\n>>> 13. Server Gateway Authorisation Audit:');

function extractBracedBody(source, startIndex) {
  var depth = 1;
  var i = startIndex;
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  return source.slice(startIndex, i - 1);
}

function getAllTopLevelFunctionBodies(source) {
  var bodies = {};
  var re = /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/g;
  var m;
  while ((m = re.exec(source))) {
    bodies[m[1]] = extractBracedBody(source, m.index + m[0].length);
  }
  return bodies;
}

test('Gateway Audit: every api* function enforces Auth.requireAuth/requireOwner directly or via a delegated service call that does', () => {
  const codeGs = fs.readFileSync('Code.gs', 'utf8');
  const serviceFiles = ['SheetRepository.gs', 'DriveService.gs', 'UnitService.gs', 'VideoService.gs', 'PdfService.gs', 'DashboardService.gs', 'Setup.gs', 'NamingService.gs', 'Validators.gs', 'AuditService.gs'];
  var serviceBodies = {};
  serviceFiles.forEach((f) => {
    if (fs.existsSync(f)) {
      Object.assign(serviceBodies, getAllTopLevelFunctionBodies(fs.readFileSync(f, 'utf8')));
    }
  });

  const gatewayBodies = getAllTopLevelFunctionBodies(codeGs);
  const apiFnNames = Object.keys(gatewayBodies).filter((n) => /^api[A-Za-z0-9_]*$/.test(n));

  assert.ok(apiFnNames.length >= 14, 'Expected to find the known api* gateways (found ' + apiFnNames.length + ')');

  const unguarded = [];
  apiFnNames.forEach((fnName) => {
    const body = gatewayBodies[fnName];
    if (/Auth\.require(Auth|Owner)\s*\(/.test(body)) return; // guards directly

    const calls = body.match(/[A-Za-z_]+Service\.[A-Za-z_]+\s*\(/g) || [];
    const guardedByDelegate = calls.some((callStr) => {
      const methodName = callStr.split('.')[1].replace(/\s*\($/, '');
      const methodBody = serviceBodies[methodName];
      return methodBody && /Auth\.require(Auth|Owner)\s*\(/.test(methodBody);
    });
    if (!guardedByDelegate) unguarded.push(fnName);
  });

  assert.deepStrictEqual(unguarded, [], 'Unguarded api* gateways found: ' + unguarded.join(', '));
});

test('Gateway Audit: owner-only gateways (setup, config) call Auth.requireOwner directly', () => {
  const codeGs = fs.readFileSync('Code.gs', 'utf8');
  const gatewayBodies = getAllTopLevelFunctionBodies(codeGs);
  ['apiSetupSystem', 'apiGetSystemConfig'].forEach((fnName) => {
    assert.ok(gatewayBodies[fnName], fnName + ' must exist');
    assert.ok(/Auth\.requireOwner\s*\(/.test(gatewayBodies[fnName]), fnName + ' must call Auth.requireOwner()');
  });
});

test('Auth.gs: getCurrentUserEmail never falls back to Session.getEffectiveUser for identity', () => {
  const authGs = fs.readFileSync('Auth.gs', 'utf8');
  const bodies = getAllTopLevelFunctionBodies(authGs);
  assert.ok(bodies.getCurrentUserEmail, 'getCurrentUserEmail must exist');
  assert.strictEqual(/getEffectiveUser/.test(bodies.getCurrentUserEmail), false,
    'getCurrentUserEmail must resolve identity from getActiveUser() only, never getEffectiveUser()');
});

// ==============================================================================
// 14. Authorised-Users Allowlist Matching Logic Simulation
// ==============================================================================
console.log('\n>>> 14. Authorised-Users Allowlist Matching Tests:');

// Mirrors Auth.gs's getCurrentUser() matching algorithm exactly (email
// resolution -> trim/lowercase -> case-insensitive allowlist match -> active
// check -> role), so these tests exercise the real decision logic even
// though the actual Sheet/Session calls cannot run outside Apps Script.
function simulateGetCurrentUser(rawEmail, allowlist, systemInitialized) {
  var email = String(rawEmail || '').trim().toLowerCase();
  if (!email) {
    return { email: '', role: null, active: false, isAuthorized: false };
  }
  var found = null;
  for (var i = 0; i < allowlist.length; i++) {
    if (String(allowlist[i].email).trim().toLowerCase() === email) {
      found = allowlist[i];
      break;
    }
  }
  if (found && (String(found.active).toUpperCase() === 'YES' || found.active === true || String(found.active).toUpperCase() === 'TRUE')) {
    return { email: email, role: found.role || 'Editor', active: true, isAuthorized: true };
  }
  if (!systemInitialized) {
    return { email: email, role: 'System Owner', active: true, isAuthorized: true, isBootstrap: true };
  }
  return { email: email, role: null, active: false, isAuthorized: false };
}

test('Allowlist: active authorised user is accepted', () => {
  const allowlist = [{ email: 'user@amlaak.com', active: 'YES', role: 'Editor' }];
  const result = simulateGetCurrentUser('user@amlaak.com', allowlist, true);
  assert.strictEqual(result.isAuthorized, true);
  assert.strictEqual(result.role, 'Editor');
});

test('Allowlist: inactive authorised user is rejected', () => {
  const allowlist = [{ email: 'user@amlaak.com', active: 'NO', role: 'Editor' }];
  const result = simulateGetCurrentUser('user@amlaak.com', allowlist, true);
  assert.strictEqual(result.isAuthorized, false);
});

test('Allowlist: missing (unlisted) user is rejected once system is initialised', () => {
  const allowlist = [{ email: 'someone-else@amlaak.com', active: 'YES', role: 'Editor' }];
  const result = simulateGetCurrentUser('intruder@unknown.com', allowlist, true);
  assert.strictEqual(result.isAuthorized, false);
});

test('Allowlist: blank/undetected active email fails closed', () => {
  const allowlist = [{ email: 'user@amlaak.com', active: 'YES', role: 'Editor' }];
  const result = simulateGetCurrentUser('', allowlist, true);
  assert.strictEqual(result.isAuthorized, false);
  assert.strictEqual(result.email, '');
});

test('Allowlist: email matching is case-insensitive', () => {
  const allowlist = [{ email: 'User@Amlaak.com', active: 'YES', role: 'Editor' }];
  const result = simulateGetCurrentUser('USER@AMLAAK.COM', allowlist, true);
  assert.strictEqual(result.isAuthorized, true);
});

test('Allowlist: email matching is whitespace-normalised', () => {
  const allowlist = [{ email: '  user@amlaak.com  ', active: 'YES', role: 'Editor' }];
  const result = simulateGetCurrentUser('  user@amlaak.com', allowlist, true);
  assert.strictEqual(result.isAuthorized, true);
});

test('Allowlist: owner accepted by owner-only check; non-owner rejected', () => {
  function requireOwner(user) {
    if (!user.isAuthorized || user.role !== 'System Owner') {
      throw new Error('Access Denied: System Owner role required for this action.');
    }
    return user;
  }
  const owner = simulateGetCurrentUser('louyashra@gmail.com', [{ email: 'louyashra@gmail.com', active: 'YES', role: 'System Owner' }], true);
  assert.doesNotThrow(() => requireOwner(owner));

  const editor = simulateGetCurrentUser('editor@amlaak.com', [{ email: 'editor@amlaak.com', active: 'YES', role: 'Editor' }], true);
  assert.throws(() => requireOwner(editor), /System Owner role required/);
});

test('Allowlist: pre-bootstrap system grants first signed-in user owner access', () => {
  const result = simulateGetCurrentUser('first-setup@amlaak.com', [], false);
  assert.strictEqual(result.isAuthorized, true);
  assert.strictEqual(result.role, 'System Owner');
  assert.strictEqual(result.isBootstrap, true);
});

// ==============================================================================
// 15. Cross-Module Call Audit (catches calls to methods a module never exports —
// e.g. Config.getTaxonomies(), which does not exist; Config.TAXONOMIES is a
// plain property. This class of bug is invisible to mocked/reimplemented logic
// tests and was only found by executing the real .gs files together.)
// ==============================================================================
console.log('\n>>> 15. Cross-Module Call Audit:');

function extractModuleExportKeys(source) {
  const idx = source.lastIndexOf('return {');
  if (idx === -1) return null;
  let i = idx + 'return {'.length;
  let depth = 1;
  let buf = '';
  for (; i < source.length && depth > 0; i++) {
    const ch = source[i];
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      if (depth > 1) continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      if (depth === 0) break;
      continue;
    }
    if (depth === 1) buf += ch;
  }
  const keys = [];
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:/g;
  let m;
  while ((m = re.exec(buf))) keys.push(m[1]);
  return keys;
}

test('Cross-Module Call Audit: every Module.member usage exists on that module\'s exported object', () => {
  const moduleFiles = ['Config.gs', 'Auth.gs', 'Utils.gs', 'Validators.gs', 'NamingService.gs', 'AuditService.gs', 'SheetRepository.gs', 'DriveService.gs', 'UnitService.gs', 'VideoService.gs', 'PdfService.gs', 'DashboardService.gs', 'Setup.gs'];
  const exportsByModule = {};
  moduleFiles.forEach((f) => {
    const varName = f.replace('.gs', '');
    if (fs.existsSync(f)) {
      const keys = extractModuleExportKeys(fs.readFileSync(f, 'utf8'));
      if (keys) exportsByModule[varName] = keys;
    }
  });

  const allSourceFiles = moduleFiles.concat(['Code.gs']);
  const missing = [];
  allSourceFiles.forEach((f) => {
    if (!fs.existsSync(f)) return;
    const source = fs.readFileSync(f, 'utf8');
    const callRe = /\b([A-Z][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b/g;
    let m;
    while ((m = callRe.exec(source))) {
      const moduleName = m[1];
      const member = m[2];
      if (!exportsByModule[moduleName]) continue; // not one of our tracked modules (e.g. SpreadsheetApp, DriveApp, Session, Utilities, Config.KEYS.X handled separately)
      if (!exportsByModule[moduleName].includes(member)) {
        missing.push(f + ': ' + moduleName + '.' + member + '()');
      }
    }
  });

  assert.deepStrictEqual(Array.from(new Set(missing)), [], 'Calls to non-existent module members found: ' + missing.join(', '));
});

// ==============================================================================
// 16. Controlled Taxonomy Content & Dropdown Reliability
// ==============================================================================
console.log('\n>>> 16. Controlled Taxonomy Content & Dropdown Reliability:');

function extractConfigTaxonomies() {
  const configGs = fs.readFileSync('Config.gs', 'utf8');
  const marker = 'var DEFAULT_TAXONOMIES = {';
  const idx = configGs.indexOf(marker);
  assert.notStrictEqual(idx, -1, 'DEFAULT_TAXONOMIES declaration must exist in Config.gs');
  const start = idx + marker.length - 1;
  let depth = 0, i = start, buf = '';
  for (; i < configGs.length; i++) {
    const ch = configGs[i];
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) { buf += ch; i++; break; } }
    buf += ch;
  }
  // DEFAULT_TAXONOMIES is a plain object literal of string arrays — safe to eval in isolation.
  return Function('"use strict"; return (' + buf + ');')();
}

const taxonomies = extractConfigTaxonomies();

test('Taxonomy: Marketing Content Type contains exactly the approved 6 values', () => {
  assert.deepStrictEqual(taxonomies.marketingContentType, ['Educational', 'Demonstration', 'Testimonial', 'Sales', 'Offer', 'Other']);
});

test('Taxonomy: Space Type contains exactly the approved 11 values', () => {
  assert.deepStrictEqual(taxonomies.spaceType, ['Full Unit', 'Reception', 'Kitchen', 'Bathroom', 'Bedroom', 'Dressing Room', 'Entrance', 'Terrace', 'Garden', 'Multiple Spaces', 'Other']);
});

test('Taxonomy: Project Video Type contains the approved 7 values', () => {
  assert.deepStrictEqual(taxonomies.projectVideoType, ['Red Brick', 'Phase 1', 'Phase 2', 'Final', 'Final with Furniture', 'Client Interview', 'Before & After']);
});

test('Taxonomy: Work Category contains exactly the approved 15 values', () => {
  assert.deepStrictEqual(taxonomies.workCategory, ['Roof', 'Ceiling', 'Materials', 'Furniture', 'Decoration', 'HDF', 'Ceramics', 'Electrical', 'Gypsum Board', 'Air Conditioning', 'Sound System', 'Doors', 'Windows', 'Painting', 'Plastering']);
});

test('Taxonomy: Unit Type contains the approved 15 values', () => {
  assert.deepStrictEqual(taxonomies.unitType, ['Apartment', 'Studio', 'Duplex', 'Penthouse', 'Roof Apartment', 'Standalone Villa', 'Twin House', 'Townhouse', 'Chalet', 'Cabin', 'Office', 'Clinic', 'Retail / Commercial Unit', 'Restaurant / Café', 'Other']);
});

test('Taxonomy: DashboardService.getBootstrapData exposes Config.TAXONOMIES directly as "lists" (server/client key match)', () => {
  const dashboardGs = fs.readFileSync('DashboardService.gs', 'utf8');
  assert.ok(/var lists\s*=\s*Config\.TAXONOMIES\s*;/.test(dashboardGs), 'getBootstrapData must assign lists = Config.TAXONOMIES verbatim');
});

test('Dropdown Reliability: required taxonomy selects get a placeholder and are tracked for the empty-list error state', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  const required = [
    ["fillSelect('pvUnitType', lists.unitType, '— Select unit type —')"],
    ["fillSelect('pvProjectVideoType', lists.projectVideoType, '— Select video type —')"],
    ["fillSelect('pvSpaceType', lists.spaceType, '— Select space type —')"],
    ["fillSelect('pvWorkCategory', lists.workCategory, '— Select work category —')"],
    ["fillSelect('mcContentType', lists.marketingContentType, '— Select content type —')"]
  ];
  required.forEach((r) => assert.ok(indexHtml.includes(r[0]), 'Missing required fillSelect call: ' + r[0]));
  assert.ok(indexHtml.includes('requiredCounts'), 'populateTaxonomyDropdowns must track required list counts');
  assert.ok(indexHtml.includes('setTaxonomyLoadErrorState'), 'setTaxonomyLoadErrorState must exist');
  assert.ok(indexHtml.includes('id="taxonomyLoadError"'), 'A visible taxonomy-load-error banner must exist in the DOM');
  assert.ok(indexHtml.includes('function retryLoadTaxonomies'), 'A Retry mechanism must exist for a failed taxonomy load');
});

test('Dropdown Reliability: empty required taxonomy list disables both Save buttons (simulated)', () => {
  function simulateSetTaxonomyLoadErrorState(hasError, buttons) {
    buttons.btnSubmitProjectVideo.disabled = hasError;
    buttons.btnSubmitMarketingContent.disabled = hasError;
    return hasError;
  }
  const buttons = { btnSubmitProjectVideo: { disabled: false }, btnSubmitMarketingContent: { disabled: false } };
  const requiredCounts = [15, 7, 0, 15, 6]; // spaceType came back empty
  const anyEmpty = requiredCounts.some((c) => c === 0);
  simulateSetTaxonomyLoadErrorState(anyEmpty, buttons);
  assert.strictEqual(buttons.btnSubmitProjectVideo.disabled, true);
  assert.strictEqual(buttons.btnSubmitMarketingContent.disabled, true);
});

test('Work Category: cleared for Marketing Content, independent of Space Type, excluded from filenames', () => {
  // Already covered in detail by Section 9; this asserts the taxonomy-level contract:
  // workCategory and spaceType are two disjoint controlled lists with no overlapping values.
  const overlap = taxonomies.workCategory.filter((w) => taxonomies.spaceType.includes(w));
  assert.deepStrictEqual(overlap, [], 'Work Category and Space Type must not share values');
});

test('UI copy: no owner-execution wording remains ("app account" / "share it with") in production client or server files', () => {
  const filesToCheck = ['Index.html', 'DriveService.gs', 'Code.gs'];
  filesToCheck.forEach((f) => {
    const content = fs.readFileSync(f, 'utf8');
    assert.strictEqual(content.includes('app account'), false, f + ' must not reference a fixed "app account" (execute-as-owner wording)');
    assert.strictEqual(content.includes('share it with'), false, f + ' must not use "share it with <owner>" wording under USER_ACCESSING');
  });
});

// ==============================================================================
// 17. Bootstrap Timeout & Client/Server Callback Resilience
// ==============================================================================
// Live browser QA against the real production deployment (real authenticated
// owner session, real /exec URL) reproduced an indefinite hang: the Apps
// Script Executions log showed apiGetAppBootstrapData completing
// successfully in ~4.5s, yet the browser's network panel showed the
// underlying google.script.run /callback POST stuck at "pending" forever,
// and the UI stayed on "Signing in..."/"Checking role..."/"Loading..." with
// no error shown. Neither withSuccessHandler nor withFailureHandler ever
// fired, so nothing in the existing try/catch could have caught it. These
// tests verify callApi() now guarantees a caller always hears back.
console.log('\n>>> 17. Bootstrap Timeout & Client/Server Callback Resilience:');

test('callApi(): accepts an optional timeoutMs override for deadline control', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  assert.ok(
    /function\s+callApi\s*\(\s*fnName\s*,\s*args\s*,\s*callback\s*,\s*timeoutMs\s*\)/.test(indexHtml),
    'callApi must accept a timeoutMs parameter'
  );
});

test('callApi(): times out with errorCode TIMEOUT when the RPC bridge never calls back, and ignores a late response afterwards', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  const bodies = getAllTopLevelFunctionBodies(indexHtml);
  assert.ok(bodies.callApi, 'callApi must exist in Index.html');

  // Fake timer queue: setTimeout/clearTimeout are captured rather than real,
  // so the test can deterministically fire the deadline callback to
  // simulate elapsed time, mirroring the exact live defect (the server
  // finishes, but the sandboxed-iframe bridge never delivers the response).
  let nextTimerId = 1;
  const pendingTimers = {};
  function fakeSetTimeout(fn) { const id = nextTimerId++; pendingTimers[id] = fn; return id; }
  function fakeClearTimeout(id) { delete pendingTimers[id]; }

  const handlers = {};
  const runStub = {
    withSuccessHandler(fn) { handlers.success = fn; return runStub; },
    withFailureHandler(fn) { handlers.failure = fn; return runStub; },
    apiGetAppBootstrapData() { /* simulates the observed hang: never calls a handler */ }
  };
  const fakeGoogle = { script: { run: runStub } };

  const factory = new Function('google', 'window', 'setTimeout', 'clearTimeout',
    'function callApi(fnName, args, callback, timeoutMs) {' + bodies.callApi + '}\nreturn callApi;');
  const sandboxedCallApi = factory(fakeGoogle, {}, fakeSetTimeout, fakeClearTimeout);

  let received = null;
  sandboxedCallApi('apiGetAppBootstrapData', [], (response) => { received = response; }, 20000);

  assert.strictEqual(received, null, 'callback must not fire while the RPC is still genuinely pending');
  const timerIds = Object.keys(pendingTimers);
  assert.strictEqual(timerIds.length, 1, 'exactly one deadline timer must be scheduled per call');

  pendingTimers[timerIds[0]](); // simulate the deadline elapsing

  assert.ok(received, 'the timeout must synthesize a response so the caller is never left hanging indefinitely');
  assert.strictEqual(received.ok, false);
  assert.strictEqual(received.errorCode, 'TIMEOUT');
  assert.ok(/second/i.test(received.message), 'timeout message should explain what happened in plain language');

  // The real server response can legitimately still arrive late (this is
  // exactly what live testing showed: the Executions log recorded success
  // seconds after the browser had already stopped waiting). It must be
  // ignored, not delivered as a confusing second callback invocation.
  received = null;
  handlers.success({ ok: true, data: { lists: {} } });
  assert.strictEqual(received, null, 'a late success response arriving after the timeout must be ignored');
});

test('callApi(): a normal fast success clears the deadline timer and is delivered immediately', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  const bodies = getAllTopLevelFunctionBodies(indexHtml);

  let nextTimerId = 1;
  const pendingTimers = {};
  function fakeSetTimeout(fn) { const id = nextTimerId++; pendingTimers[id] = fn; return id; }
  function fakeClearTimeout(id) { delete pendingTimers[id]; }

  const handlers = {};
  const runStub = {
    withSuccessHandler(fn) { handlers.success = fn; return runStub; },
    withFailureHandler(fn) { handlers.failure = fn; return runStub; },
    apiGetAppBootstrapData() { handlers.success({ ok: true, data: { lists: {} } }); }
  };
  const fakeGoogle = { script: { run: runStub } };

  const factory = new Function('google', 'window', 'setTimeout', 'clearTimeout',
    'function callApi(fnName, args, callback, timeoutMs) {' + bodies.callApi + '}\nreturn callApi;');
  const sandboxedCallApi = factory(fakeGoogle, {}, fakeSetTimeout, fakeClearTimeout);

  let received = null;
  sandboxedCallApi('apiGetAppBootstrapData', [], (response) => { received = response; }, 20000);

  assert.ok(received && received.ok === true, 'a normal fast success must be delivered immediately');
  assert.deepStrictEqual(Object.keys(pendingTimers), [], 'the deadline timer must be cleared once the real response arrives');
});

test('callApi(): a genuine server failure also clears the deadline timer and is delivered immediately', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  const bodies = getAllTopLevelFunctionBodies(indexHtml);

  const pendingTimers = {};
  let nextTimerId = 1;
  function fakeSetTimeout(fn) { const id = nextTimerId++; pendingTimers[id] = fn; return id; }
  function fakeClearTimeout(id) { delete pendingTimers[id]; }

  const handlers = {};
  const runStub = {
    withSuccessHandler(fn) { handlers.success = fn; return runStub; },
    withFailureHandler(fn) { handlers.failure = fn; return runStub; },
    apiGetAppBootstrapData() { handlers.failure({ message: 'Server exploded' }); }
  };
  const fakeGoogle = { script: { run: runStub } };

  const factory = new Function('google', 'window', 'setTimeout', 'clearTimeout',
    'function callApi(fnName, args, callback, timeoutMs) {' + bodies.callApi + '}\nreturn callApi;');
  const sandboxedCallApi = factory(fakeGoogle, {}, fakeSetTimeout, fakeClearTimeout);

  let received = null;
  sandboxedCallApi('apiGetAppBootstrapData', [], (response) => { received = response; }, 20000);

  assert.deepStrictEqual(received, { ok: false, message: 'Server exploded' });
  assert.deepStrictEqual(Object.keys(pendingTimers), [], 'the deadline timer must be cleared on a real failure too');
});

test('showFatalConnectionError(): has a distinct TIMEOUT branch, not just the generic connection-error copy', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  const bodies = getAllTopLevelFunctionBodies(indexHtml);
  assert.ok(bodies.showFatalConnectionError, 'showFatalConnectionError must exist');
  const body = bodies.showFatalConnectionError;
  assert.ok(/errorCode\s*===\s*['"]TIMEOUT['"]/.test(body), 'must branch on errorCode === "TIMEOUT"');
  assert.ok(/Connection timed out/.test(body), 'must present an honest, distinct title for a timeout');
});

test('Write buttons (Save Video / Save Content) start disabled in markup until Bootstrap succeeds', () => {
  const indexHtml = fs.readFileSync('Index.html', 'utf8');
  ['btnSubmitProjectVideo', 'btnSubmitMarketingContent'].forEach((id) => {
    const match = indexHtml.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'));
    assert.ok(match, id + ' button must exist');
    assert.ok(/\bdisabled\b/.test(match[0]), id + ' must start disabled so it cannot be used before Bootstrap succeeds');
  });
});

test('dist/Index.html stays in sync with the timeout fix (built output matches source)', () => {
  const src = fs.readFileSync('Index.html', 'utf8');
  const dist = fs.readFileSync('dist/Index.html', 'utf8');
  ['DEFAULT_API_TIMEOUT_MS', "errorCode: 'TIMEOUT'", 'Connection timed out'].forEach((needle) => {
    assert.ok(src.includes(needle), 'source Index.html must contain: ' + needle);
    assert.ok(dist.includes(needle), 'dist/Index.html must contain: ' + needle);
  });
});

// ==============================================================================
// 18. GitHub Pages Shared-Code Gateway Security Tests
// ==============================================================================
console.log('\n>>> 18. GitHub Pages Shared-Code Gateway Security Tests:');

test('Gateway: action allowlist contains exactly the intended actions, and never exposes owner-only setup/config actions', () => {
  const gatewaySrc = fs.readFileSync('Gateway.gs', 'utf8');
  const actionsMatch = gatewaySrc.match(/var ACTIONS = \{([\s\S]*?)\n  \};/);
  assert.ok(actionsMatch, 'ACTIONS object must be found in Gateway.gs');
  const actionNames = Array.from(actionsMatch[1].matchAll(/^\s{4}(\w+):\s*function/gm)).map((m) => m[1]);

  const expected = [
    'health', 'login', 'sessionCheck', 'getBootstrapData', 'getDashboard',
    'getVideos', 'addProjectVideo', 'addMarketingContent', 'addNewVersion',
    'getVideoVersionHistory', 'updateSingleVideoMetadata', 'getUnits',
    'getUnitDetail', 'createUnit', 'updateUnit', 'uploadPdf'
  ].sort();
  assert.deepStrictEqual(actionNames.sort(), expected, 'Gateway ACTIONS must match the exact intended allowlist');

  ['setupSystem', 'getSystemConfig', 'setAccessCode', 'revokeAllSessions'].forEach((forbidden) => {
    assert.strictEqual(actionNames.includes(forbidden), false, forbidden + ' must never be exposed on the public gateway');
  });
});

test('Gateway: PUBLIC_ACTIONS contains exactly health and login', () => {
  const gatewaySrc = fs.readFileSync('Gateway.gs', 'utf8');
  const match = gatewaySrc.match(/var PUBLIC_ACTIONS = \{([\s\S]*?)\};/);
  assert.ok(match, 'PUBLIC_ACTIONS object must be found');
  const names = Array.from(match[1].matchAll(/(\w+):\s*true/g)).map((m) => m[1]);
  assert.deepStrictEqual(names.sort(), ['health', 'login']);
});

test('Gateway: every protected action requires GatewaySession.validateSession before dispatch', () => {
  const gatewaySrc = fs.readFileSync('Gateway.gs', 'utf8');
  const bodies = getAllTopLevelFunctionBodies(gatewaySrc);
  assert.ok(bodies.handleRequest, 'handleRequest function must exist');
  const body = bodies.handleRequest;

  const ifIdx = body.indexOf('if (!PUBLIC_ACTIONS[action])');
  const validateIdx = body.indexOf('GatewaySession.validateSession(');
  const markIdx = body.indexOf('Auth.markGatewaySessionAuthenticated()');
  const dispatchIdx = body.indexOf('ACTIONS[action](payload)');

  assert.ok(ifIdx !== -1 && validateIdx !== -1 && markIdx !== -1 && dispatchIdx !== -1,
    'handleRequest must gate protected actions with validateSession and markGatewaySessionAuthenticated before dispatch');
  assert.ok(ifIdx < validateIdx && validateIdx < markIdx && markIdx < dispatchIdx,
    'session validation and gateway-session marking must happen strictly before the action is dispatched');
});

test('GatewaySession: ONE_TIME_setAccessCode still has the placeholder, not a real committed code', () => {
  const src = fs.readFileSync('GatewaySession.gs', 'utf8');
  assert.ok(src.includes("var rawCode = 'CHANGE_ME';"), 'the raw access code must never be committed — only the CHANGE_ME placeholder');
});

test('GatewaySession: setAccessCode/revokeAllSessions are owner-editor-only, never referenced from Gateway.gs', () => {
  const gatewaySrc = fs.readFileSync('Gateway.gs', 'utf8');
  assert.strictEqual(/ONE_TIME_setAccessCode|ONE_TIME_revokeAllSessions/.test(gatewaySrc), false,
    'these must only be run manually by the owner from the Apps Script editor, never reachable through the public gateway');
});

test('Gateway/GatewaySession never rely on a Google identity — authorisation is entirely via the shared-code session', () => {
  const src = fs.readFileSync('Gateway.gs', 'utf8') + fs.readFileSync('GatewaySession.gs', 'utf8');
  assert.strictEqual(/getActiveUser|getEffectiveUser/.test(src), false);
});

// --- Behavioural simulation of the exact hashing/session algorithm ---
// Mirrors GatewaySession.gs using Node's crypto instead of Apps Script's
// Utilities.computeDigest (same SHA-256 algorithm), since CacheService/
// PropertiesService/Utilities cannot run outside Apps Script.

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function gwConstantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function makeGatewaySessionSimulator() {
  const scriptProps = {};
  const cache = new Map();

  function getProperty(key, dflt) {
    return scriptProps[key] !== undefined ? scriptProps[key] : (dflt || '');
  }
  function setProperties(obj) { Object.assign(scriptProps, obj); }
  function setProperty(key, val) { scriptProps[key] = val; }
  function generateSalt() { return crypto.randomBytes(16).toString('hex') + crypto.randomBytes(16).toString('hex'); }

  function setAccessCode(rawCode) {
    if (!rawCode || String(rawCode).length < 8) throw new Error('Access code must be at least 8 characters.');
    const salt = generateSalt();
    const hash = sha256Hex(salt + String(rawCode));
    setProperties({ APP_ACCESS_CODE_SALT: salt, APP_ACCESS_CODE_HASH: hash, APP_SESSION_EPOCH: String(Date.now()) });
  }

  function verifyAccessCode(rawCode) {
    const salt = getProperty('APP_ACCESS_CODE_SALT');
    const storedHash = getProperty('APP_ACCESS_CODE_HASH');
    if (!salt || !storedHash || !rawCode) return false;
    return gwConstantTimeEquals(sha256Hex(salt + rawCode), storedHash);
  }

  function isAccessCodeConfigured() { return !!(getProperty('APP_ACCESS_CODE_SALT') && getProperty('APP_ACCESS_CODE_HASH')); }

  function createSession() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(token);
    const epoch = getProperty('APP_SESSION_EPOCH', '0');
    cache.set('gwsession_' + tokenHash, { epoch });
    return { token, expiresInSeconds: 21600 };
  }

  function validateSession(token) {
    if (!token) return false;
    const record = cache.get('gwsession_' + sha256Hex(token));
    if (!record) return false;
    return record.epoch === getProperty('APP_SESSION_EPOCH', '0');
  }

  function invalidateSession(token) {
    if (!token) return;
    cache.delete('gwsession_' + sha256Hex(token));
  }

  function bumpSessionEpoch() { setProperty('APP_SESSION_EPOCH', String(Date.now()) + Math.random()); }

  return {
    setAccessCode, verifyAccessCode, isAccessCodeConfigured, createSession,
    validateSession, invalidateSession, bumpSessionEpoch,
    _scriptProps: () => scriptProps
  };
}

test('GatewaySession simulation: raw access code is never stored, only a salted hash', () => {
  const gw = makeGatewaySessionSimulator();
  gw.setAccessCode('correct-horse-battery-staple');
  const props = gw._scriptProps();
  assert.ok(props.APP_ACCESS_CODE_HASH && props.APP_ACCESS_CODE_HASH.length === 64, 'must store a 64-char hex SHA-256 hash');
  assert.ok(props.APP_ACCESS_CODE_SALT, 'must store a random salt');
  Object.values(props).forEach((v) => {
    assert.strictEqual(String(v).includes('correct-horse-battery-staple'), false, 'the raw access code must never appear in any stored property');
  });
});

test('GatewaySession simulation: same code hashed twice produces different salts and different hashes', () => {
  const gw1 = makeGatewaySessionSimulator();
  const gw2 = makeGatewaySessionSimulator();
  gw1.setAccessCode('same-code-12345');
  gw2.setAccessCode('same-code-12345');
  assert.notStrictEqual(gw1._scriptProps().APP_ACCESS_CODE_SALT, gw2._scriptProps().APP_ACCESS_CODE_SALT);
  assert.notStrictEqual(gw1._scriptProps().APP_ACCESS_CODE_HASH, gw2._scriptProps().APP_ACCESS_CODE_HASH);
});

test('GatewaySession simulation: verifyAccessCode accepts the correct code and rejects everything else', () => {
  const gw = makeGatewaySessionSimulator();
  gw.setAccessCode('amlaak-2026-secure');
  assert.strictEqual(gw.verifyAccessCode('amlaak-2026-secure'), true);
  assert.strictEqual(gw.verifyAccessCode('amlaak-2026-Secure'), false, 'must be case-sensitive');
  assert.strictEqual(gw.verifyAccessCode('wrong-code'), false);
  assert.strictEqual(gw.verifyAccessCode(''), false);
  assert.strictEqual(gw.verifyAccessCode(null), false);
  assert.strictEqual(gw.verifyAccessCode(undefined), false);
});

test('GatewaySession simulation: login before setAccessCode is configured always fails closed', () => {
  const gw = makeGatewaySessionSimulator();
  assert.strictEqual(gw.isAccessCodeConfigured(), false);
  assert.strictEqual(gw.verifyAccessCode('anything'), false);
});

test('GatewaySession simulation: a created session validates until invalidated', () => {
  const gw = makeGatewaySessionSimulator();
  gw.setAccessCode('unit-test-code-123');
  const { token } = gw.createSession();
  assert.strictEqual(gw.validateSession(token), true);
  assert.strictEqual(gw.validateSession('not-a-real-token'), false);

  gw.invalidateSession(token);
  assert.strictEqual(gw.validateSession(token), false, 'logout must invalidate the session immediately');
});

test('GatewaySession simulation: bumping the session epoch invalidates every previously-issued session', () => {
  const gw = makeGatewaySessionSimulator();
  gw.setAccessCode('unit-test-code-456');
  const sessionA = gw.createSession();
  const sessionB = gw.createSession();
  assert.strictEqual(gw.validateSession(sessionA.token), true);
  assert.strictEqual(gw.validateSession(sessionB.token), true);

  gw.bumpSessionEpoch();

  assert.strictEqual(gw.validateSession(sessionA.token), false, 'epoch bump must invalidate sessions issued under the old epoch');
  assert.strictEqual(gw.validateSession(sessionB.token), false);

  const sessionC = gw.createSession();
  assert.strictEqual(gw.validateSession(sessionC.token), true, 'a freshly-issued session under the new epoch must still work');
});

// --- Behavioural simulation of Gateway.handleRequest's routing/validation control flow ---

function simulateGatewayHandleRequest(rawBody, deps) {
  const PUBLIC_ACTIONS = { health: true, login: true };
  try {
    if (typeof rawBody !== 'string' || rawBody.length === 0) {
      return { ok: false, errorCode: 'BAD_REQUEST', message: 'Empty request body.' };
    }
    let request;
    try {
      request = JSON.parse(rawBody);
    } catch (e) {
      return { ok: false, errorCode: 'BAD_REQUEST', message: 'Request body is not valid JSON.' };
    }
    if (request === null || typeof request !== 'object' || Array.isArray(request)) {
      return { ok: false, errorCode: 'BAD_REQUEST', message: 'Request body must be a JSON object.' };
    }
    const requestId = typeof request.requestId === 'string' ? request.requestId.slice(0, 100) : '';
    const action = request.action;
    if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(deps.ACTIONS, action)) {
      return { ok: false, errorCode: 'UNKNOWN_ACTION', message: 'Unknown or unsupported action.', requestId };
    }
    const payload = (request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload)) ? request.payload : {};

    if (!PUBLIC_ACTIONS[action]) {
      const sessionToken = typeof request.sessionToken === 'string' ? request.sessionToken : '';
      if (!deps.validateSession(sessionToken)) {
        return { ok: false, errorCode: 'SESSION_INVALID', message: 'Your session has expired or is invalid. Please log in again.', requestId };
      }
    }

    let data;
    try {
      data = deps.ACTIONS[action](payload);
    } catch (actionErr) {
      if (actionErr && actionErr.code) {
        return { ok: false, errorCode: actionErr.code, message: actionErr.message, requestId };
      }
      return { ok: false, errorCode: 'EXECUTION_ERROR', message: (actionErr && actionErr.message) || String(actionErr), requestId };
    }
    return { ok: true, data, errorCode: null, requestId };
  } catch (fatal) {
    return { ok: false, errorCode: 'EXECUTION_ERROR', message: 'An unexpected server error occurred.' };
  }
}

test('Gateway simulation: unknown action is rejected without touching session validation', () => {
  let validateCalled = false;
  const res = simulateGatewayHandleRequest(JSON.stringify({ action: 'deleteEverything', requestId: 'r1' }), {
    ACTIONS: { health: () => ({}) },
    validateSession: () => { validateCalled = true; return true; }
  });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.errorCode, 'UNKNOWN_ACTION');
  assert.strictEqual(validateCalled, false, 'an unknown action must be rejected before any session check runs');
});

test('Gateway simulation: protected action without a session token is rejected', () => {
  const res = simulateGatewayHandleRequest(JSON.stringify({ action: 'getBootstrapData', requestId: 'r2' }), {
    ACTIONS: { getBootstrapData: () => ({ secret: 'data' }) },
    validateSession: () => false
  });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.errorCode, 'SESSION_INVALID');
  assert.strictEqual(res.data, undefined, 'no data may be returned when the session is invalid');
});

test('Gateway simulation: protected action with a valid session token dispatches and returns data', () => {
  const res = simulateGatewayHandleRequest(JSON.stringify({ action: 'getBootstrapData', sessionToken: 'valid-token', requestId: 'r3' }), {
    ACTIONS: { getBootstrapData: () => ({ lists: { unitType: ['Apartment'] } }) },
    validateSession: (t) => t === 'valid-token'
  });
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.data, { lists: { unitType: ['Apartment'] } });
  assert.strictEqual(res.requestId, 'r3', 'the same requestId must be echoed back');
});

test('Gateway simulation: public actions (health, login) dispatch without any session token', () => {
  const res = simulateGatewayHandleRequest(JSON.stringify({ action: 'health', requestId: 'r4' }), {
    ACTIONS: { health: () => ({ status: 'ok' }) },
    validateSession: () => false // must not even be consulted for a public action
  });
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.data, { status: 'ok' });
});

test('Gateway simulation: malformed JSON body is rejected safely, not thrown', () => {
  const res = simulateGatewayHandleRequest('{not valid json', { ACTIONS: {}, validateSession: () => true });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.errorCode, 'BAD_REQUEST');
});

test('Gateway simulation: a specific error code thrown inside an action is preserved; a plain Error maps to EXECUTION_ERROR', () => {
  const resSpecific = simulateGatewayHandleRequest(JSON.stringify({ action: 'login', requestId: 'r5' }), {
    ACTIONS: { login: () => { const e = new Error('Incorrect access code.'); e.code = 'INVALID_CODE'; throw e; } },
    validateSession: () => true
  });
  assert.strictEqual(resSpecific.errorCode, 'INVALID_CODE');

  const resGeneric = simulateGatewayHandleRequest(JSON.stringify({ action: 'health', requestId: 'r6' }), {
    ACTIONS: { health: () => { throw new Error('Sheet is temporarily locked.'); } },
    validateSession: () => true
  });
  assert.strictEqual(resGeneric.errorCode, 'EXECUTION_ERROR');
  assert.strictEqual(resGeneric.message, 'Sheet is temporarily locked.');
});

test('Gateway simulation: array or non-object request bodies are rejected, not treated as objects', () => {
  const res = simulateGatewayHandleRequest(JSON.stringify(['health']), { ACTIONS: { health: () => ({}) }, validateSession: () => true });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.errorCode, 'BAD_REQUEST');
});

console.log('\n' + '='.repeat(70));
console.log(`TOTAL UNIT TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
}
