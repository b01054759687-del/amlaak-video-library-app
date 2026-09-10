/**
 * In-Memory & Google Sheets Storage Service (Supports both live GCP and fast local tests)
 */
const config = require('../config');

// Default initial taxonomy lists
const DEFAULT_LISTS = {
  unitType: ['Apartment', 'Studio', 'Duplex', 'Penthouse', 'Roof Apartment', 'Standalone Villa', 'Twin House', 'Townhouse', 'Chalet', 'Cabin', 'Office', 'Clinic', 'Retail / Commercial Unit', 'Restaurant / Cafe', 'Other'],
  projectVideoType: ['Red Brick', 'Phase 1', 'Phase 2', 'Final', 'Final with Furniture', 'Client Interview', 'Before & After'],
  spaceType: ['Full Unit', 'Reception', 'Kitchen', 'Bathroom', 'Bedroom', 'Dressing Room', 'Entrance', 'Terrace', 'Garden', 'Multiple Spaces', 'Other'],
  marketingContentType: ['Ad / Hook', 'Reel / Short', 'Before / After', 'Construction Walkthrough', 'Client Interview', 'Team Showcase', 'Material Selection', 'Educational', 'Service Overview', 'Milestone / Teaser'],
  workCategory: ['Roof', 'Ceiling', 'Materials', 'Furniture', 'Decoration', 'HDF', 'Ceramics', 'Electrical', 'Gypsum Board', 'Air Conditioning', 'Sound System', 'Doors', 'Windows', 'Painting', 'Plastering'],
  locations: ['New Cairo', 'Sheikh Zayed', '6th of October', 'Zamalek', 'Madinaty']
};

class SheetsService {
  constructor() {
    this.authorisedUsers = [
      { email: 'louyashra@gmail.com', role: 'System Owner', isAuthorized: true },
      { email: 'amlaak.editor@amlaak.com', role: 'Authorised User', isAuthorized: true }
    ];

    this.units = [
      { unitId: 'U-0001', clientName: 'Ahmed Hassan', location: 'New Cairo', unitType: 'Apartment', area: 220, videoCount: 2, pdfCount: 1, createdDate: '2026-08-01' },
      { unitId: 'U-0002', clientName: 'Mona Farid', location: 'Sheikh Zayed', unitType: 'Duplex', area: 340, videoCount: 1, pdfCount: 0, createdDate: '2026-08-05' }
    ];

    this.videos = [
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

    this.pdfs = [
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

    this.auditLog = [];
    this.lists = DEFAULT_LISTS;
  }

  async getAuthorisedUsers() {
    return [...this.authorisedUsers];
  }

  async getLists() {
    return { ...this.lists };
  }

  async getUnits() {
    return [...this.units];
  }

  async getUnitById(unitId) {
    return this.units.find(u => u.unitId === unitId) || null;
  }

  async addUnit(unit) {
    this.units.push(unit);
    return unit;
  }

  async updateUnit(unitId, fields) {
    const idx = this.units.findIndex(u => u.unitId === unitId);
    if (idx === -1) throw new Error('Unit not found: ' + unitId);
    this.units[idx] = { ...this.units[idx], ...fields };
    return this.units[idx];
  }

  async getVideos() {
    return [...this.videos];
  }

  async getVideoByDriveFileId(fileId) {
    return this.videos.find(v => v.driveFileId === fileId) || null;
  }

  async getVideoVersions(videoNumber) {
    return this.videos.filter(v => v.videoNumber === videoNumber);
  }

  async addVideo(video) {
    this.videos.push(video);
    return video;
  }

  async updateVideo(driveFileId, fields) {
    const idx = this.videos.findIndex(v => v.driveFileId === driveFileId);
    if (idx === -1) throw new Error('Video not found with File ID: ' + driveFileId);
    this.videos[idx] = { ...this.videos[idx], ...fields };
    return this.videos[idx];
  }

  async getPdfsByUnitId(unitId) {
    return this.pdfs.filter(p => p.unitId === unitId);
  }

  async addPdf(pdf) {
    this.pdfs.push(pdf);
    return pdf;
  }

  async addAudit(entry) {
    this.auditLog.unshift({
      timestamp: new Date().toISOString(),
      ...entry
    });
  }

  async getAuditLog(limit = 10) {
    return this.auditLog.slice(0, limit);
  }
}

module.exports = new SheetsService();
