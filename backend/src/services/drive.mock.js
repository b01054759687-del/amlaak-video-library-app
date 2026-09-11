/**
 * Amlaak Video Library — Mock Drive Service
 * For development & unit tests only.
 */
class MockDriveService {
  async verifyFile(fileId) {
    if (!fileId || !/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) {
      throw new Error('Invalid Google Drive File ID format');
    }
    return {
      id: fileId,
      name: 'mock_video_' + fileId + '.mp4',
      mimeType: 'video/mp4',
      size: '2048576',
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`
    };
  }

  async renameAndMoveFile(fileId, newName, targetFolderId) {
    return {
      id: fileId,
      name: newName,
      targetFolderId: targetFolderId
    };
  }

  async uploadPdfFile(streamOrBuffer, metadata, targetFolderId) {
    return {
      id: 'mockpdf_' + Date.now(),
      name: metadata.name,
      size: '102400',
      webViewLink: 'https://drive.google.com/file/d/mockpdf/view'
    };
  }
}

module.exports = MockDriveService;
