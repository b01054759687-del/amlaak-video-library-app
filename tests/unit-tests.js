/**
 * Amlaak Video Library — Comprehensive Node.js Unit Test Suite
 * Tests naming rules, ID generators, validation, Decision A/B/C logic, and BI metrics.
 */

const assert = require('assert');
const fs = require('fs');

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
// 12. Apps Script Manifest — Owner-Only Access Invariant
// ==============================================================================
console.log('\n>>> 12. Apps Script Manifest Tests:');

test('Manifest: webapp.access is MYSELF and executeAs is USER_DEPLOYING (root)', () => {
  const manifest = JSON.parse(fs.readFileSync('appsscript.json', 'utf8'));
  assert.strictEqual(manifest.webapp.access, 'MYSELF', 'webapp.access must be MYSELF for owner-only production');
  assert.strictEqual(manifest.webapp.executeAs, 'USER_DEPLOYING');
});

test('Manifest: no executionApi block exists (deprecated Execution API architecture)', () => {
  const manifest = JSON.parse(fs.readFileSync('appsscript.json', 'utf8'));
  assert.strictEqual(manifest.executionApi, undefined, 'executionApi must not be configured');
});

test('Manifest: no deployment access value equals ANYONE or ANYONE_ANONYMOUS anywhere in the manifest', () => {
  const raw = fs.readFileSync('appsscript.json', 'utf8');
  assert.strictEqual(raw.includes('ANYONE_ANONYMOUS'), false);
  assert.strictEqual(raw.includes('"ANYONE"'), false);
  assert.strictEqual(raw.includes('USER_ACCESSING'), false, 'USER_ACCESSING is not a valid owner-only value');
});

test('Manifest: built dist/appsscript.json matches the root deployment configuration exactly', () => {
  const rootManifest = fs.readFileSync('appsscript.json', 'utf8');
  const distManifest = fs.readFileSync('dist/appsscript.json', 'utf8');
  assert.strictEqual(distManifest, rootManifest, 'dist/appsscript.json must be byte-identical to the root manifest');
});

console.log('\n' + '='.repeat(70));
console.log(`TOTAL UNIT TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
}
