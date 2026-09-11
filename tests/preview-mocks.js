/**
 * Amlaak Video Library — LOCAL BROWSER PREVIEW HARNESS (TEST-ONLY).
 *
 * This file is NEVER bundled into dist/ and is NOT part of the Apps Script
 * production deployment. It exists solely so the UI can be exercised in a
 * plain browser (outside the Apps Script container) during local QA.
 *
 * It is loaded by tests/build-preview.js, which assembles a throwaway copy
 * of the app under tests/.preview/ with this script injected. The real
 * Index.html shipped to dist/ and Apps Script has no knowledge of this file
 * and fails closed (see showFatalConnectionError) if google.script.run is
 * unavailable.
 *
 * All identifiers below (client names, unit IDs, locations) are fictional
 * test fixtures — see section 8 of CLAUDE-LOCAL-IMPLEMENTATION-REPORT.md.
 */
(function () {
  var mockLists = {
    unitType: ['Apartment', 'Studio', 'Duplex', 'Penthouse', 'Roof Apartment', 'Standalone Villa', 'Twin House', 'Townhouse', 'Chalet', 'Cabin', 'Office', 'Clinic', 'Retail / Commercial Unit', 'Restaurant / Cafe', 'Other'],
    projectVideoType: ['Red Brick', 'Phase 1', 'Phase 2', 'Final', 'Final with Furniture', 'Client Interview', 'Before & After'],
    spaceType: ['Full Unit', 'Reception', 'Kitchen', 'Bathroom', 'Bedroom', 'Dressing Room', 'Entrance', 'Terrace', 'Garden', 'Multiple Spaces', 'Other'],
    marketingContentType: ['Educational', 'Demonstration', 'Testimonial', 'Sales', 'Offer', 'Other'],
    workCategory: ['Roof', 'Ceiling', 'Materials', 'Furniture', 'Decoration', 'HDF', 'Ceramics', 'Electrical', 'Gypsum Board', 'Air Conditioning', 'Sound System', 'Doors', 'Windows', 'Painting', 'Plastering'],
    locations: ['New Cairo', 'Sheikh Zayed', '6th of October', 'Zamalek', 'Madinaty']
  };

  var mockUnits = [
    { unitId: 'TEST-U-0001', clientName: '[Test Fixture] Sample Client A', location: 'New Cairo', unitType: 'Apartment', area: 220, videoCount: 2, pdfCount: 1 },
    { unitId: 'TEST-U-0002', clientName: '[Test Fixture] Sample Client B', location: 'Sheikh Zayed', unitType: 'Duplex', area: 340, videoCount: 1, pdfCount: 0 }
  ];

  var mockVideos = [
    { videoNumber: '0001', versionNumber: 'V02', isCurrentVersion: true, videoSource: 'Project Video', clientName: '[Test Fixture] Sample Client A', location: 'New Cairo', projectVideoType: 'Final', spaceType: 'Kitchen', workCategory: 'Ceramics', shootingDate: '2026-08-17', videoName: '[Test Fixture] Sample Client A - New Cairo - Final - Kitchen - 2026-08-17 - V02.mp4', driveFileId: 'testmock1abcdefghijklmnopqrstuv', versionNotes: 'Approved cut', addedDate: '2026-08-18' },
    { videoNumber: '0001', versionNumber: 'V01', isCurrentVersion: false, videoSource: 'Project Video', clientName: '[Test Fixture] Sample Client A', location: 'New Cairo', projectVideoType: 'Final', spaceType: 'Kitchen', workCategory: 'Ceramics', shootingDate: '2026-08-17', videoName: '[Test Fixture] Sample Client A - New Cairo - Final - Kitchen - 2026-08-17 - V01.mp4', driveFileId: 'testmock1a_bcdefghijklmnopqrstuv', versionNotes: 'Initial cut', addedDate: '2026-08-14' },
    { videoNumber: '0002', versionNumber: 'V01', isCurrentVersion: true, videoSource: 'Marketing Content', topic: 'Plumbing rough-in mistakes', contentType: 'Educational', spaceType: '', shootingDate: '2026-08-10', videoName: 'Educational - Plumbing rough-in mistakes - 2026-08-10 - V01.mp4', driveFileId: 'testmock2_abcdefghijklmnopqrstuv', versionNotes: '', addedDate: '2026-08-11' }
  ];

  window._localMockDispatcher = function (fnName, args, callback) {
    setTimeout(function () {
      if (fnName === 'apiGetAppBootstrapData') {
        callback({
          ok: true,
          data: {
            user: { email: 'test-harness@example.com', role: 'System Owner', isAuthorized: true },
            lists: mockLists,
            isConfigured: true,
            dashboard: {
              kpis: { totalLogicalVideos: 2, totalStoredVersions: 3, totalProjectVideos: 1, projectVersionsCount: 2, totalMarketingContent: 1, marketingVersionsCount: 1, totalUnits: 2, totalStoredPdfs: 1 },
              breakdowns: {
                locations: [{ name: 'New Cairo', count: 2 }, { name: 'Sheikh Zayed', count: 1 }],
                stages: [{ name: 'Final', count: 2 }, { name: 'Educational', count: 1 }],
                spaces: [{ name: 'Kitchen', count: 2 }],
                workCategories: [{ name: 'Ceramics', count: 2 }]
              },
              recentActivity: [{ message: 'Saved video 0001 (Final, Kitchen)', user: 'test-harness@example.com', timestamp: '2026-08-18 10:02', action: 'ADD_VERSION' }]
            },
            unitLookups: [
              { unitId: 'TEST-U-0001', clientName: '[Test Fixture] Sample Client A', location: 'New Cairo', unitType: 'Apartment', area: 220 },
              { unitId: 'TEST-U-0002', clientName: '[Test Fixture] Sample Client B', location: 'Sheikh Zayed', unitType: 'Duplex', area: 340 }
            ],
            config: { spreadsheetId: 'TEST-FIXTURE-SPREADSHEET-ID', rootFolderId: 'TEST-FIXTURE-FOLDER-ID' }
          }
        });
      } else if (fnName === 'apiGetInitialData') {
        callback({ ok: true, data: { user: { email: 'test-harness@example.com', role: 'System Owner' }, lists: mockLists, isConfigured: true } });
      } else if (fnName === 'apiGetDashboard') {
        callback({ ok: true, data: {
          kpis: { totalLogicalVideos: 2, totalStoredVersions: 3, totalProjectVideos: 1, projectVersionsCount: 2, totalMarketingContent: 1, marketingVersionsCount: 1, totalUnits: 2, totalStoredPdfs: 1 },
          breakdowns: {
            locations: [{ name: 'New Cairo', count: 2 }, { name: 'Sheikh Zayed', count: 1 }],
            stages: [{ name: 'Final', count: 2 }, { name: 'Educational', count: 1 }],
            spaces: [{ name: 'Kitchen', count: 2 }],
            workCategories: [{ name: 'Ceramics', count: 2 }]
          },
          recentActivity: [{ message: 'Saved video 0001 (Final, Kitchen)', user: 'test-harness@example.com', timestamp: '2026-08-18 10:02', action: 'ADD_VERSION' }]
        }});
      } else if (fnName === 'apiGetUnits') {
        callback({ ok: true, data: mockUnits });
      } else if (fnName === 'apiGetVideos') {
        var f = args && args[0] ? args[0] : {};
        var curOnly = !f.includePreviousVersions;
        var vids = curOnly ? mockVideos.filter(function (v) { return v.isCurrentVersion; }) : mockVideos;
        callback({ ok: true, data: { items: vids, page: 1, pageSize: 25, totalCount: vids.length, totalPages: 1, hasMore: false } });
      } else if (fnName === 'apiGetVideoVersionHistory') {
        var vNum = args[0];
        var matched = mockVideos.filter(function (v) { return v.videoNumber === vNum; });
        if (matched.length === 0) matched = mockVideos;
        callback({ ok: true, data: { videoNumber: vNum, title: matched[0].clientName || matched[0].topic, videoSource: matched[0].videoSource, currentVersion: matched[0], totalVersions: matched.length, versions: matched } });
      } else if (fnName === 'apiCreateUnit') {
        var payload = args[0];
        var newU = {
          unitId: 'TEST-U-' + (mockUnits.length + 1 < 10 ? '000' : '00') + (mockUnits.length + 1),
          clientName: payload.clientName,
          location: payload.location,
          unitType: payload.unitType,
          area: payload.area,
          videoCount: 0,
          pdfCount: 0
        };
        mockUnits.push(newU);
        callback({ ok: true, data: newU });
      } else if (fnName === 'apiUpdateSingleVideoMetadata') {
        var driveFileId = args[0];
        var target = mockVideos.find(function (v) { return v.driveFileId === driveFileId; }) || mockVideos[0];
        callback({ ok: true, data: { success: true, renamed: true, newName: 'Renamed-' + target.videoName } });
      } else if (fnName === 'apiGetUnitDetail') {
        var unitId = args[0];
        var unit = mockUnits.find(function (u) { return u.unitId === unitId; }) || mockUnits[0];
        callback({ ok: true, data: {
          unit: unit,
          videos: [{ videoNumber: '0001', projectVideoType: 'Final', spaceType: 'Kitchen', currentVersion: mockVideos[0], versions: [mockVideos[0], mockVideos[1]] }],
          pdfs: [{ documentTitle: 'Approved lighting layout', pdfVersionNumber: 'V01', isCurrentVersion: true, versionNotes: '', addedDate: '2026-08-12', driveFileId: 'testmockpdf1_abcdefghijklmnopqrstuv' }]
        }});
      } else if (fnName === 'apiGetSystemConfig') {
        callback({ ok: true, data: { spreadsheetId: 'TEST-FIXTURE-SPREADSHEET-ID', rootFolderId: 'TEST-FIXTURE-FOLDER-ID', users: [{ email: 'test-harness@example.com', role: 'System Owner' }] } });
      } else {
        callback({ ok: true, data: { message: '(test harness) "' + fnName + '" is a mock — nothing was actually saved.', video: { videoName: 'preview.mp4' }, videoName: 'preview.mp4' } });
      }
    }, 200);
  };

  // The harness always has a mock dispatcher available, so bypass the real
  // google.script.run gate the production app uses.
  window.__AMLAAK_TEST_HARNESS__ = true;
})();
