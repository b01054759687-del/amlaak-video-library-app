/**
 * Amlaak Video Library — Comprehensive Backend Test Suite
 */
const assert = require('assert');
const http = require('http');
const { createServer } = require('../src/server');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  [PASSED] ${name}`);
      passed++;
    })
    .catch(err => {
      console.error(`  [FAILED] ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    });
}

console.log('='.repeat(70));
console.log('AMLAAK VIDEO LIBRARY — PRODUCTION BACKEND UNIT & API TESTS');
console.log('='.repeat(70));

const server = createServer();

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

server.listen(0, async () => {
  const port = server.address().port;
  console.log('\n>>> Testing against test server on port:', port);

  try {
    // 1. Health check
    await test('GET /api/v1/health: Returns 200 and healthy status without auth', async () => {
      const res = await makeRequest({ host: '127.0.0.1', port, path: '/api/v1/health', method: 'GET' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.status, 'HEALTHY');
    });

    // 2. Unauthenticated access rejection
    await test('GET /api/v1/bootstrap: Rejects missing Authorization header with 401', async () => {
      const res = await makeRequest({ host: '127.0.0.1', port, path: '/api/v1/bootstrap', method: 'GET' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.ok, false);
      assert.strictEqual(res.data.errorCode, 'UNAUTHORIZED');
    });

    // 3. Unauthorised user allowlist rejection
    await test('GET /api/v1/bootstrap: Rejects un-allowlisted email with 403 FORBIDDEN', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/bootstrap',
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token-stranger@gmail.com' }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.ok, false);
      assert.strictEqual(res.data.errorCode, 'FORBIDDEN');
    });

    // 4. Authorised bootstrap
    await test('GET /api/v1/bootstrap: Succeeds with allowlisted user and returns single-trip payload', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/bootstrap',
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token-louyashra@gmail.com' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.user.email, 'louyashra@gmail.com');
      assert.ok(res.data.data.lists.workCategory.length > 0);
      assert.ok(res.data.data.dashboard.kpis.totalLogicalVideos > 0);
    });

    // 5. Unit creation
    await test('POST /api/v1/units: Creates new unit with U-0003 sequence ID and validates inputs', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/units',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token-louyashra@gmail.com',
          'Content-Type': 'application/json'
        }
      }, {
        clientName: 'Eng. Karim Ezzat',
        location: 'New Cairo',
        unitType: 'Penthouse',
        area: 310
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.unitId, 'U-0003');
      assert.strictEqual(res.data.data.clientName, 'Eng. Karim Ezzat');
    });

    // 6. Project Video registration and naming
    await test('POST /api/v1/videos/project: Generates exact Section 12 name excluding Work Category', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/videos/project',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token-louyashra@gmail.com',
          'Content-Type': 'application/json'
        }
      }, {
        clientName: 'Hassan Allam',
        location: 'Sheikh Zayed',
        unitType: 'Standalone Villa',
        projectVideoType: 'Phase 1',
        spaceType: 'Terrace',
        workCategory: 'Ceramics',
        shootingDate: '2026-08-20',
        videoLink: 'https://drive.google.com/file/d/1ZxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view'
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.video.videoName, 'Hassan Allam - Sheikh Zayed - Phase 1 - Terrace - 2026-08-20 - V01.mp4');
      assert.strictEqual(res.data.data.video.videoName.includes('Ceramics'), false, 'Work Category must be excluded from filename');
    });

    // 7. Duplicate Drive File ID rejection
    await test('POST /api/v1/videos/project: Rejects duplicate Google Drive File ID', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/videos/project',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token-louyashra@gmail.com',
          'Content-Type': 'application/json'
        }
      }, {
        clientName: 'Another Client',
        location: 'Zamalek',
        projectVideoType: 'Final',
        spaceType: 'Full Unit',
        shootingDate: '2026-08-21',
        videoLink: 'https://drive.google.com/file/d/1ZxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view' // duplicate
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.ok, false);
      assert.ok(res.data.message.includes('already registered'));
    });

    // 8. Video Version History
    await test('GET /api/v1/videos/:vNum/versions: Returns descending versions with single Current flag', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/videos/0001/versions',
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token-louyashra@gmail.com' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.ok, true);
      const vList = res.data.data.versions;
      assert.strictEqual(vList[0].versionNumber, 'V02');
      assert.strictEqual(vList[0].isCurrentVersion, true);
      assert.strictEqual(vList[1].versionNumber, 'V01');
      assert.strictEqual(vList[1].isCurrentVersion, false);
    });

    // 9. Add New Version
    await test('POST /api/v1/videos/version: Adds V03, marks V02 previous', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/videos/version',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token-louyashra@gmail.com',
          'Content-Type': 'application/json'
        }
      }, {
        videoNumber: '0001',
        driveFileId: '1FreshMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        versionNotes: 'Final color corrected cut'
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.versionNumber, 'V03');
      assert.strictEqual(res.data.data.isCurrentVersion, true);
    });

    // 10. Edit Metadata Rename Confirmation
    await test('PATCH /api/v1/videos/:driveId/metadata: Flags requiresRenameConfirmation if space changes', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/videos/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/metadata',
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer test-token-louyashra@gmail.com',
          'Content-Type': 'application/json'
        }
      }, {
        fields: { spaceType: 'Reception' },
        confirmRename: false
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.requiresRenameConfirmation, true);
      assert.strictEqual(res.data.data.proposedName.includes('Reception'), true);
    });

    // 11. PDF Upload & Version Transition
    await test('POST /api/v1/pdfs: Advances PDF from V01 to V02 maintaining single Current invariant', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/pdfs',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token-louyashra@gmail.com',
          'Content-Type': 'application/json'
        }
      }, {
        unitId: 'U-0001',
        fileName: 'lighting-v2.pdf',
        documentTitle: 'Updated Lighting Plan',
        driveFileId: '1PdfMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.versionNumber, 'V02');
    });

    // 12. Owner-only configuration
    await test('GET /api/v1/config: System Owner allowed, Authorised User rejected with 403', async () => {
      const ownerRes = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/config',
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token-louyashra@gmail.com' }
      });
      assert.strictEqual(ownerRes.status, 200);
      assert.strictEqual(ownerRes.data.ok, true);

      const userRes = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/config',
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token-amlaak.editor@amlaak.com' }
      });
      assert.strictEqual(userRes.status, 403);
      assert.strictEqual(userRes.data.errorCode, 'OWNER_REQUIRED');
    });

    // 13. Controlled Pagination
    await test('GET /api/v1/videos: Server-side pagination returns items, page, and totalPages', async () => {
      const res = await makeRequest({
        host: '127.0.0.1',
        port,
        path: '/api/v1/videos?page=1&pageSize=2',
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token-louyashra@gmail.com' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.ok, true);
      assert.strictEqual(res.data.data.items.length <= 2, true);
      assert.strictEqual(res.data.data.page, 1);
      assert.strictEqual(typeof res.data.data.totalCount, 'number');
    });

  } finally {
    server.close();
    console.log('\n' + '='.repeat(70));
    console.log(`BACKEND TESTS SUMMARY: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('='.repeat(70));
    if (failed > 0) process.exit(1);
  }
});
