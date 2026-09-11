/**
 * Amlaak Video Library — Isolated Test Fixtures
 * For use ONLY within test suites. Never imported by production runtime.
 */
const FIXTURE_LISTS = {
  unitType: ['Apartment', 'Studio', 'Duplex', 'Penthouse', 'Roof Apartment', 'Standalone Villa', 'Twin House', 'Townhouse', 'Chalet', 'Cabin', 'Office', 'Clinic', 'Retail / Commercial Unit', 'Restaurant / Cafe', 'Other'],
  projectVideoType: ['Red Brick', 'Phase 1', 'Phase 2', 'Final', 'Final with Furniture', 'Client Interview', 'Before & After'],
  spaceType: ['Full Unit', 'Reception', 'Kitchen', 'Bathroom', 'Bedroom', 'Dressing Room', 'Entrance', 'Terrace', 'Garden', 'Multiple Spaces', 'Other'],
  marketingContentType: ['Educational', 'Demonstration', 'Testimonial', 'Sales', 'Offer', 'Other'],
  workCategory: ['Roof', 'Ceiling', 'Materials', 'Furniture', 'Decoration', 'HDF', 'Ceramics', 'Electrical', 'Gypsum Board', 'Air Conditioning', 'Sound System', 'Doors', 'Windows', 'Painting', 'Plastering'],
  locations: ['New Cairo', 'Sheikh Zayed', '6th of October', 'Zamalek', 'Madinaty']
};

const FIXTURE_UNITS = [
  { unitId: 'U-0001', clientName: 'Ahmed Hassan', location: 'New Cairo', unitType: 'Apartment', area: 220, videoCount: 2, pdfCount: 1, createdDate: '2026-08-01' },
  { unitId: 'U-0002', clientName: 'Mona Farid', location: 'Sheikh Zayed', unitType: 'Duplex', area: 340, videoCount: 1, pdfCount: 0, createdDate: '2026-08-05' }
];

const FIXTURE_VIDEOS = [
  {
    videoNumber: '0001',
    versionNumber: 'V02',
    isCurrentVersion: true,
    videoSource: 'Project Video',
    unitId: 'U-0001',
    clientName: 'Ahmed Hassan',
    location: 'New Cairo',
    unitType: 'Apartment',
    area: '220',
    projectVideoType: 'Final',
    spaceType: 'Kitchen',
    workCategory: 'Ceramics',
    shootingDate: '2026-08-17',
    videoName: 'Ahmed Hassan - New Cairo - Final - Kitchen - 2026-08-17 - V02.mp4',
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    versionNotes: 'Approved color grade',
    addedDate: '2026-08-18'
  },
  {
    videoNumber: '0001',
    versionNumber: 'V01',
    isCurrentVersion: false,
    videoSource: 'Project Video',
    unitId: 'U-0001',
    clientName: 'Ahmed Hassan',
    location: 'New Cairo',
    unitType: 'Apartment',
    area: '220',
    projectVideoType: 'Final',
    spaceType: 'Kitchen',
    workCategory: 'Ceramics',
    shootingDate: '2026-08-17',
    videoName: 'Ahmed Hassan - New Cairo - Final - Kitchen - 2026-08-17 - V01.mp4',
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms_v01',
    versionNotes: 'Initial rough cut',
    addedDate: '2026-08-14'
  },
  {
    videoNumber: '0002',
    versionNumber: 'V01',
    isCurrentVersion: true,
    videoSource: 'Marketing Content',
    unitId: '',
    contentType: 'Educational',
    topic: 'Plumbing rough-in mistakes',
    spaceType: '',
    shootingDate: '2026-08-10',
    videoName: 'Educational - Plumbing rough-in mistakes - 2026-08-10 - V01.mp4',
    driveFileId: '1CxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    versionNotes: 'Main teaser reel',
    addedDate: '2026-08-11'
  }
];

const FIXTURE_PDFS = [
  {
    pdfRecordId: 'U-0001-PDF-01',
    unitId: 'U-0001',
    pdfVersionNumber: 'V01',
    isCurrentVersion: true,
    documentTitle: 'Lighting Plan Approved',
    driveFileId: '1DxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    versionNotes: 'Approved by client',
    addedDate: '2026-08-12'
  }
];

module.exports = {
  FIXTURE_LISTS,
  FIXTURE_UNITS,
  FIXTURE_VIDEOS,
  FIXTURE_PDFS
};
