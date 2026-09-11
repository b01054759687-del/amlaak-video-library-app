/**
 * Amlaak Video Library — Production Google Sheets API v4 Service
 * Implements live Sheet reads and writes using official googleapis library (§8).
 */
const { google } = require('googleapis');
const config = require('../config');

// Escape CSV / Spreadsheet formula injection (§17)
function escapeFormula(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/^[=+\-@\t\r]/.test(s.trim())) {
    return "'" + s;
  }
  return s;
}

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = config.SPREADSHEET_ID;
  }

  async getClient() {
    if (!this.sheets) {
      this.auth = new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    }
    return this.sheets;
  }

  async getAuthorisedUsers() {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: "'Authorised Users'!A2:D"
    });
    const rows = res.data.values || [];
    return rows.map(r => ({
      email: (r[0] || '').trim().toLowerCase(),
      isAuthorized: (r[1] || '').toString().toLowerCase() === 'true' || (r[1] || '').toString().toLowerCase() === 'yes',
      role: r[2] || 'Authorised User',
      addedDate: r[3] || ''
    })).filter(u => u.email);
  }

  async getLists() {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: "'Lists'!A2:F"
    });
    const rows = res.data.values || [];
    const lists = {
      videoSource: [],
      unitType: [],
      projectVideoType: [],
      spaceType: [],
      marketingContentType: [],
      workCategory: [],
      locations: []
    };

    rows.forEach(r => {
      if (r[0]) lists.videoSource.push(r[0].trim());
      if (r[1]) lists.unitType.push(r[1].trim());
      if (r[2]) lists.projectVideoType.push(r[2].trim());
      if (r[3]) lists.spaceType.push(r[3].trim());
      if (r[4]) lists.marketingContentType.push(r[4].trim());
      if (r[5]) lists.workCategory.push(r[5].trim());
    });

    return lists;
  }

  async getUnits() {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: "'Units'!A2:I"
    });
    const rows = res.data.values || [];
    return rows.map((r, i) => ({
      rowIndex: i + 2,
      unitId: r[0] || '',
      clientName: r[1] || '',
      location: r[2] || '',
      unitType: r[3] || '',
      area: r[4] ? Number(r[4]) : '',
      createdDate: r[5] || '',
      createdBy: r[6] || '',
      updatedDate: r[7] || '',
      updatedBy: r[8] || '',
      videoCount: 0,
      pdfCount: 0
    })).filter(u => u.unitId);
  }

  async getUnitById(unitId) {
    const units = await this.getUnits();
    return units.find(u => u.unitId === unitId) || null;
  }

  async addUnit(unit) {
    const sheets = await this.getClient();
    const row = [
      escapeFormula(unit.unitId),
      escapeFormula(unit.clientName),
      escapeFormula(unit.location),
      escapeFormula(unit.unitType),
      unit.area !== undefined && unit.area !== '' ? Number(unit.area) : '',
      unit.createdDate || new Date().toISOString().split('T')[0],
      escapeFormula(unit.createdBy || ''),
      unit.updatedDate || new Date().toISOString().split('T')[0],
      escapeFormula(unit.updatedBy || '')
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "'Units'!A:I",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    // Read-back verification (§8)
    const verified = await this.getUnitById(unit.unitId);
    if (!verified) {
      throw new Error(`Write verification failed: Unit ${unit.unitId} was not confirmed in Sheet.`);
    }
    return verified;
  }

  async updateUnit(unitId, fields) {
    const units = await this.getUnits();
    const target = units.find(u => u.unitId === unitId);
    if (!target) throw new Error('Unit not found: ' + unitId);

    const updated = { ...target, ...fields };
    const row = [
      escapeFormula(updated.unitId),
      escapeFormula(updated.clientName),
      escapeFormula(updated.location),
      escapeFormula(updated.unitType),
      updated.area !== undefined && updated.area !== '' ? Number(updated.area) : '',
      updated.createdDate,
      escapeFormula(updated.createdBy),
      new Date().toISOString().split('T')[0],
      escapeFormula(updated.updatedBy || '')
    ];

    const sheets = await this.getClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `'Units'!A${target.rowIndex}:I${target.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    // Read-back verification
    const verified = await this.getUnitById(unitId);
    return verified;
  }

  async getVideos() {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: "'Video Versions'!A2:AB"
    });
    const rows = res.data.values || [];
    return rows.map((r, i) => ({
      rowIndex: i + 2,
      videoNumber: r[0] || '',
      versionNumber: r[1] || '',
      isCurrentVersion: (r[2] || '').toString().toLowerCase() === 'true' || (r[2] || '').toString().toLowerCase() === 'yes',
      versionNotes: r[3] || '',
      videoName: r[4] || '',
      videoSource: r[5] || '',
      unitId: r[6] || '',
      contentType: r[7] || '',
      topic: r[8] || '',
      clientName: r[9] || '',
      location: r[10] || '',
      unitType: r[11] || '',
      area: r[12] || '',
      projectVideoType: r[13] || '',
      spaceType: r[14] || '',
      workCategory: r[15] || '',
      shootingDate: r[16] || '',
      videoLink: r[17] || '',
      driveFileId: r[18] || '',
      originalFileName: r[19] || '',
      duration: r[20] || '',
      orientation: r[21] || '',
      fileType: r[22] || '',
      fileSize: r[23] || '',
      addedDate: r[24] || '',
      addedBy: r[25] || '',
      updatedDate: r[26] || '',
      updatedBy: r[27] || ''
    })).filter(v => v.videoNumber);
  }

  async getVideoByDriveFileId(fileId) {
    const videos = await this.getVideos();
    return videos.find(v => v.driveFileId === fileId) || null;
  }

  async getVideoVersions(videoNumber) {
    const videos = await this.getVideos();
    return videos.filter(v => v.videoNumber === videoNumber);
  }

  async addVideo(video) {
    const sheets = await this.getClient();
    const row = [
      escapeFormula(video.videoNumber),
      escapeFormula(video.versionNumber),
      video.isCurrentVersion ? 'TRUE' : 'FALSE',
      escapeFormula(video.versionNotes || ''),
      escapeFormula(video.videoName || ''),
      escapeFormula(video.videoSource || ''),
      escapeFormula(video.unitId || ''),
      escapeFormula(video.contentType || ''),
      escapeFormula(video.topic || ''),
      escapeFormula(video.clientName || ''),
      escapeFormula(video.location || ''),
      escapeFormula(video.unitType || ''),
      escapeFormula(video.area || ''),
      escapeFormula(video.projectVideoType || ''),
      escapeFormula(video.spaceType || ''),
      escapeFormula(video.workCategory || ''),
      escapeFormula(video.shootingDate || ''),
      escapeFormula(video.videoLink || ''),
      escapeFormula(video.driveFileId || ''),
      escapeFormula(video.originalFileName || ''),
      escapeFormula(video.duration || ''),
      escapeFormula(video.orientation || ''),
      escapeFormula(video.fileType || ''),
      escapeFormula(video.fileSize || ''),
      video.addedDate || new Date().toISOString().split('T')[0],
      escapeFormula(video.addedBy || ''),
      video.updatedDate || new Date().toISOString().split('T')[0],
      escapeFormula(video.updatedBy || '')
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "'Video Versions'!A:AB",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    // Read-back verification (§8)
    const verified = await this.getVideoByDriveFileId(video.driveFileId);
    if (!verified) {
      throw new Error(`Write verification failed: Video ${video.driveFileId} was not confirmed in Sheet.`);
    }
    return verified;
  }

  async updateVideo(driveFileId, fields) {
    const videos = await this.getVideos();
    const target = videos.find(v => v.driveFileId === driveFileId);
    if (!target) throw new Error('Video not found with File ID: ' + driveFileId);

    const updated = { ...target, ...fields };
    const row = [
      escapeFormula(updated.videoNumber),
      escapeFormula(updated.versionNumber),
      updated.isCurrentVersion ? 'TRUE' : 'FALSE',
      escapeFormula(updated.versionNotes || ''),
      escapeFormula(updated.videoName || ''),
      escapeFormula(updated.videoSource || ''),
      escapeFormula(updated.unitId || ''),
      escapeFormula(updated.contentType || ''),
      escapeFormula(updated.topic || ''),
      escapeFormula(updated.clientName || ''),
      escapeFormula(updated.location || ''),
      escapeFormula(updated.unitType || ''),
      escapeFormula(updated.area || ''),
      escapeFormula(updated.projectVideoType || ''),
      escapeFormula(updated.spaceType || ''),
      escapeFormula(updated.workCategory || ''),
      escapeFormula(updated.shootingDate || ''),
      escapeFormula(updated.videoLink || ''),
      escapeFormula(updated.driveFileId || ''),
      escapeFormula(updated.originalFileName || ''),
      escapeFormula(updated.duration || ''),
      escapeFormula(updated.orientation || ''),
      escapeFormula(updated.fileType || ''),
      escapeFormula(updated.fileSize || ''),
      updated.addedDate,
      escapeFormula(updated.addedBy || ''),
      new Date().toISOString().split('T')[0],
      escapeFormula(updated.updatedBy || '')
    ];

    const sheets = await this.getClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `'Video Versions'!A${target.rowIndex}:AB${target.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    return updated;
  }

  async getPdfsByUnitId(unitId) {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: "'Unit Design PDFs'!A2:P"
    });
    const rows = res.data.values || [];
    return rows.map(r => ({
      pdfRecordId: r[0] || '',
      unitId: r[1] || '',
      documentTitle: r[2] || '',
      pdfLink: r[3] || '',
      driveFileId: r[4] || '',
      originalFileName: r[5] || '',
      fileType: r[6] || '',
      fileSize: r[7] || '',
      pdfNumber: r[8] || '',
      pdfVersionNumber: r[9] || '',
      isCurrentVersion: (r[10] || '').toString().toLowerCase() === 'true' || (r[10] || '').toString().toLowerCase() === 'yes',
      versionNotes: r[11] || '',
      addedDate: r[12] || '',
      addedBy: r[13] || '',
      updatedDate: r[14] || '',
      updatedBy: r[15] || ''
    })).filter(p => p.unitId === unitId);
  }

  async addPdf(pdf) {
    const sheets = await this.getClient();
    const row = [
      escapeFormula(pdf.pdfRecordId),
      escapeFormula(pdf.unitId),
      escapeFormula(pdf.documentTitle),
      escapeFormula(pdf.pdfLink || ''),
      escapeFormula(pdf.driveFileId),
      escapeFormula(pdf.originalFileName || ''),
      escapeFormula(pdf.fileType || 'application/pdf'),
      escapeFormula(pdf.fileSize || ''),
      escapeFormula(pdf.pdfNumber || '1'),
      escapeFormula(pdf.pdfVersionNumber),
      pdf.isCurrentVersion ? 'TRUE' : 'FALSE',
      escapeFormula(pdf.versionNotes || ''),
      pdf.addedDate || new Date().toISOString().split('T')[0],
      escapeFormula(pdf.addedBy || ''),
      pdf.updatedDate || new Date().toISOString().split('T')[0],
      escapeFormula(pdf.updatedBy || '')
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "'Unit Design PDFs'!A:P",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    return pdf;
  }

  async addAudit(entry) {
    try {
      const sheets = await this.getClient();
      const row = [
        new Date().toISOString(),
        escapeFormula(entry.user || ''),
        escapeFormula(entry.action || ''),
        escapeFormula(entry.entityType || ''),
        escapeFormula(entry.entityId || ''),
        escapeFormula(entry.driveFileId || ''),
        escapeFormula(entry.result || 'SUCCESS'),
        escapeFormula(entry.errorCode || ''),
        escapeFormula(entry.safeMessage || '')
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: "'Audit Log'!A:I",
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
      });
    } catch (err) {
      console.error('Failed to append audit log to Google Sheets:', err.message);
    }
  }

  async getAuditLog(limit = 10) {
    try {
      const sheets = await this.getClient();
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "'Audit Log'!A2:I"
      });
      const rows = res.data.values || [];
      return rows.slice(-limit).reverse().map(r => ({
        timestamp: r[0] || '',
        user: r[1] || '',
        action: r[2] || '',
        entityType: r[3] || '',
        entityId: r[4] || '',
        driveFileId: r[5] || '',
        result: r[6] || '',
        errorCode: r[7] || '',
        safeMessage: r[8] || ''
      }));
    } catch (e) {
      return [];
    }
  }
}

module.exports = GoogleSheetsService;
