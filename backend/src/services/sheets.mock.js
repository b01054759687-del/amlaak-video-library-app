/**
 * Amlaak Video Library — Mock Sheets Repository
 * For development & unit testing ONLY. Strictly forbidden in production.
 */
const path = require('path');
const { FIXTURE_LISTS, FIXTURE_UNITS, FIXTURE_VIDEOS, FIXTURE_PDFS } = require(path.resolve(__dirname, '../../../tests/fixtures/demo-records'));

class MockSheetsService {
  constructor() {
    this.authorisedUsers = [
      { email: 'louyashra@gmail.com', role: 'System Owner', isAuthorized: true },
      { email: 'amlaak.editor@amlaak.com', role: 'Authorised User', isAuthorized: true }
    ];
    this.units = JSON.parse(JSON.stringify(FIXTURE_UNITS));
    this.videos = JSON.parse(JSON.stringify(FIXTURE_VIDEOS));
    this.pdfs = JSON.parse(JSON.stringify(FIXTURE_PDFS));
    this.auditLog = [];
    this.lists = JSON.parse(JSON.stringify(FIXTURE_LISTS));
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

module.exports = MockSheetsService;
