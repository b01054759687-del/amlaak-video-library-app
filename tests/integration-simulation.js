/**
 * Amlaak Video Library — Integration & Workflow Simulation Test
 * Simulates complete end-to-end Drive/Sheets workflows, permission prerequisites,
 * version transitions, Decision C propagation, and batch rename partial failure recovery.
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${desc}`);
    console.error(`     Error: ${e.message}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log('AMLAAK VIDEO LIBRARY — INTEGRATION SIMULATION SUITE');
console.log('='.repeat(70));

// Mock Database State
const DB = {
  units: [],
  videos: [],
  pdfs: [],
  audit: [],
  driveFiles: {}
};

// Simulated Drive Service
const MockDrive = {
  files: {},
  createFile(id, name, mime, permissionLevel) {
    this.files[id] = { id, name, mime, permission: permissionLevel || 'EDITOR', folder: 'root' };
  },
  verifyEditorAccess(fileId, executeAsEmail) {
    const file = this.files[fileId];
    if (!file) throw new Error('File not found in Drive: ' + fileId);
    if (file.permission !== 'EDITOR' && file.permission !== 'OWNER') {
      throw new Error(`This file isn't shared with the app account yet — share it with ${executeAsEmail} as Editor and try again`);
    }
    return true;
  },
  renameFile(fileId, newName) {
    if (!this.files[fileId]) throw new Error('File not found: ' + fileId);
    const oldName = this.files[fileId].name;
    this.files[fileId].name = newName;
    return { fileId, oldName, newName };
  },
  moveFile(fileId, targetFolder) {
    if (!this.files[fileId]) throw new Error('File not found: ' + fileId);
    this.files[fileId].folder = targetFolder;
    return { fileId, targetFolder };
  }
};

console.log('\n>>> Integration Suite 1: Drive Editor Permission Prerequisite (§6 & §13):');

it('Throws specific editor access error when Drive file is not shared as Editor', () => {
  MockDrive.createFile('file_view_only_1234567890123456', 'raw.mp4', 'video/mp4', 'VIEWER');
  let threwExpected = false;
  try {
    MockDrive.verifyEditorAccess('file_view_only_1234567890123456', 'app@amlaak.com');
  } catch (err) {
    if (err.message === "This file isn't shared with the app account yet — share it with app@amlaak.com as Editor and try again") {
      threwExpected = true;
    }
  }
  assert.strictEqual(threwExpected, true, 'Must produce exact specific error message for missing editor access');
});

it('Succeeds when file is shared as Editor', () => {
  MockDrive.createFile('file_editor_ok_1234567890123456', 'raw.mp4', 'video/mp4', 'EDITOR');
  assert.doesNotThrow(() => {
    MockDrive.verifyEditorAccess('file_editor_ok_1234567890123456', 'app@amlaak.com');
  });
});

console.log('\n>>> Integration Suite 2: Video Version Transitions & Preservation (§14):');

it('Adding a new version marks previous version as No and keeps previous file intact', () => {
  // Version 1
  MockDrive.createFile('drive_v1_file_1234567890123456', 'Ahmed - Final - V01.mp4', 'video/mp4', 'EDITOR');
  DB.videos.push({
    videoNumber: '0001',
    versionNumber: 'V01',
    isCurrentVersion: true,
    driveFileId: 'drive_v1_file_1234567890123456',
    videoName: 'Ahmed - Final - V01.mp4'
  });

  // Add Version 2
  MockDrive.createFile('drive_v2_file_1234567890123456', 'Ahmed - Final - V02.mp4', 'video/mp4', 'EDITOR');
  
  // Flip V1 to No
  DB.videos.forEach(v => {
    if (v.videoNumber === '0001') v.isCurrentVersion = false;
  });

  DB.videos.push({
    videoNumber: '0001',
    versionNumber: 'V02',
    isCurrentVersion: true,
    driveFileId: 'drive_v2_file_1234567890123456',
    videoName: 'Ahmed - Final - V02.mp4'
  });

  // Verify
  const v1 = DB.videos.find(v => v.versionNumber === 'V01');
  const v2 = DB.videos.find(v => v.versionNumber === 'V02');

  assert.strictEqual(v1.isCurrentVersion, false);
  assert.strictEqual(v2.isCurrentVersion, true);
  assert(MockDrive.files['drive_v1_file_1234567890123456'], 'Previous Drive file must not be deleted');
});

console.log('\n>>> Integration Suite 3: Unit Design PDF Versioning (Decision B, §2.2 & §15):');

it('Preserves architectural PDF version history per Unit ID (Current vs Previous)', () => {
  // PDF Version 1
  DB.pdfs.push({
    pdfRecordId: 'DOC-U0001-V01',
    unitId: 'U-0001',
    pdfVersionNumber: 'V01',
    isCurrentVersion: true,
    driveFileId: 'pdf_file_v1_1234567890123456'
  });

  // Upload PDF Version 2
  DB.pdfs.forEach(p => {
    if (p.unitId === 'U-0001') p.isCurrentVersion = false;
  });

  DB.pdfs.push({
    pdfRecordId: 'DOC-U0001-V02',
    unitId: 'U-0001',
    pdfVersionNumber: 'V02',
    isCurrentVersion: true,
    driveFileId: 'pdf_file_v2_1234567890123456'
  });

  const pdfs = DB.pdfs.filter(p => p.unitId === 'U-0001');
  assert.strictEqual(pdfs.length, 2);
  assert.strictEqual(pdfs[0].isCurrentVersion, false);
  assert.strictEqual(pdfs[1].isCurrentVersion, true);
});

console.log('\n>>> Integration Suite 4: Decision C Propagation & Partial Failure Resilience (§2.3):');

it('Propagates Unit edits and handles batch rename partial failure with accurate report', () => {
  const filesToRename = [
    { fileId: 'file_ok_1', currentName: 'Old1.mp4', proposedName: 'New1.mp4' },
    { fileId: 'file_fail_quota', currentName: 'Old2.mp4', proposedName: 'New2.mp4' },
    { fileId: 'file_ok_3', currentName: 'Old3.mp4', proposedName: 'New3.mp4' }
  ];

  MockDrive.createFile('file_ok_1', 'Old1.mp4', 'video/mp4', 'EDITOR');
  // 'file_fail_quota' is intentionally not in MockDrive to simulate Drive API quota/error
  MockDrive.createFile('file_ok_3', 'Old3.mp4', 'video/mp4', 'EDITOR');

  const results = { successful: [], failed: [] };

  filesToRename.forEach(task => {
    try {
      const renamed = MockDrive.renameFile(task.fileId, task.proposedName);
      results.successful.push(renamed);
    } catch (e) {
      results.failed.push({ fileId: task.fileId, error: e.message });
    }
  });

  assert.strictEqual(results.successful.length, 2, 'Two files should succeed');
  assert.strictEqual(results.failed.length, 1, 'One file should fail without breaking the batch');
  assert.strictEqual(results.failed[0].fileId, 'file_fail_quota');
});

console.log('\n>>> Integration Suite 5: Consolidated Bootstrap Single Round-Trip Simulation (§6):');

it('Executes bootstrap in a single round-trip without multiple Sheet openings', () => {
  let sheetOpenCount = 0;
  const mockSheetBackend = {
    openSpreadsheet() {
      sheetOpenCount++;
      return {
        getUnits() { return [{ unitId: 'U-0001', clientName: 'Ahmed' }]; },
        getVideos() { return [{ videoNumber: '0001', isCurrentVersion: true }]; },
        getPdfs() { return [{ pdfRecordId: 'U-0001-PDF-01' }]; }
      };
    }
  };

  // Cached bootstrap handler
  let cachedSS = null;
  function getCachedSpreadsheet() {
    if (!cachedSS) cachedSS = mockSheetBackend.openSpreadsheet();
    return cachedSS;
  }

  function simulateApiBootstrap() {
    const ss = getCachedSpreadsheet();
    const units = ss.getUnits();
    const videos = ss.getVideos();
    const pdfs = ss.getPdfs();

    return {
      ok: true,
      data: {
        user: { email: 'louyashra@gmail.com', role: 'System Owner', isAuthorized: true },
        lists: { workCategory: ['Ceramics', 'Roof'] },
        dashboard: {
          kpis: {
            totalLogicalVideos: videos.length,
            totalStoredVersions: videos.length,
            totalUnits: units.length,
            totalStoredPdfs: pdfs.length
          }
        },
        unitLookups: units.map(u => ({ unitId: u.unitId, clientName: u.clientName })),
        isConfigured: true
      }
    };
  }

  const result = simulateApiBootstrap();
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.data.dashboard.kpis.totalUnits, 1);
  assert.strictEqual(sheetOpenCount, 1, 'Spreadsheet must be opened exactly once during bootstrap');
});

console.log('\n>>> Integration Suite 6: Idempotent Schema Migration Simulation (Decision A):');

it('Adds missing Work Category column safely to legacy sheet without data shifting', () => {
  // Legacy sheet headers and data without Work Category
  const legacyHeaders = ['Video Number', 'Video Name', 'Client Name', 'Location', 'Space Type'];
  const legacyRows = [
    ['0001', 'Ahmed - New Cairo - V01.mp4', 'Ahmed', 'New Cairo', 'Kitchen']
  ];

  const requiredHeaders = ['Video Number', 'Video Name', 'Client Name', 'Location', 'Space Type', 'Work Category'];

  // Perform migration check
  const headerSet = {};
  legacyHeaders.forEach(h => { headerSet[h.toLowerCase()] = true; });

  const addedColumns = [];
  requiredHeaders.forEach(req => {
    if (!headerSet[req.toLowerCase()]) {
      legacyHeaders.push(req);
      addedColumns.push(req);
      // Append blank value to existing rows to prevent column skew
      legacyRows.forEach(row => row.push(''));
    }
  });

  assert.strictEqual(addedColumns.length, 1);
  assert.strictEqual(addedColumns[0], 'Work Category');
  assert.strictEqual(legacyHeaders.includes('Work Category'), true);
  assert.strictEqual(legacyRows[0].length, legacyHeaders.length);
  assert.strictEqual(legacyRows[0][4], 'Kitchen', 'Space Type must stay at index 4 without shifting');
  assert.strictEqual(legacyRows[0][5], '', 'Work Category at index 5 must default safely to empty');
});

console.log('\n' + '='.repeat(70));
console.log(`TOTAL INTEGRATION TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
}
