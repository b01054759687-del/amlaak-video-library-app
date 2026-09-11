/**
 * Amlaak Video Library — Production Google Drive API v3 Service (§9)
 * Executes live Drive operations using official googleapis library.
 */
const { google } = require('googleapis');
const config = require('../config');

class GoogleDriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.rootFolderId = config.ROOT_FOLDER_ID;
  }

  async getClient() {
    if (!this.drive) {
      this.auth = new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
    }
    return this.drive;
  }

  async verifyFile(fileId) {
    if (!fileId || !/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) {
      throw new Error('Invalid Google Drive File ID format');
    }
    const drive = await this.getClient();
    try {
      const res = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, parents, webViewLink, trashed'
      });
      if (res.data.trashed) {
        throw new Error('Google Drive file is in the trash');
      }
      return res.data;
    } catch (err) {
      if (err.code === 404) {
        throw new Error('File not found on Google Drive or not accessible by application account');
      }
      throw err;
    }
  }

  async renameAndMoveFile(fileId, newName, targetFolderId) {
    const drive = await this.getClient();
    const current = await this.verifyFile(fileId);

    const updateParams = {
      fileId: fileId,
      requestBody: { name: newName },
      fields: 'id, name, parents, webViewLink'
    };

    if (targetFolderId && current.parents) {
      const previousParents = current.parents.join(',');
      updateParams.addParents = targetFolderId;
      updateParams.removeParents = previousParents;
    }

    const res = await drive.files.update(updateParams);
    return res.data;
  }

  async uploadPdfFile(streamOrBuffer, metadata, targetFolderId) {
    const drive = await this.getClient();
    const fileMetadata = {
      name: metadata.name,
      parents: targetFolderId ? [targetFolderId] : [this.rootFolderId]
    };
    const media = {
      mimeType: 'application/pdf',
      body: streamOrBuffer
    };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, size'
    });
    return res.data;
  }
}

module.exports = GoogleDriveService;
