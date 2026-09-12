/**
 * Amlaak Video Library — Drive Service
 * Manages Google Drive file access, validation, renaming, moving, and PDF uploads.
 */

var DriveService = (function() {
  function getFolderById(folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      throw new Error('Could not access the Google Drive folder (Folder ID: ' + folderId + '). Verify the ID and permissions are correct.');
    }
  }

  function getFileById(fileId) {
    try {
      return DriveApp.getFileById(fileId);
    } catch (e) {
      throw new Error('Could not find the file in Google Drive (File ID: ' + fileId + '). Verify the link is correct.');
    }
  }

  /**
   * Verifies that the execute-as account has Editor permission on the file.
   * Required by Section 6 and Section 13 step 7.
   */
  function verifyEditorAccess(file) {
    // Under the original Apps Script HTML UI (webapp.executeAs =
    // USER_ACCESSING), this runs as the current accessing user, so it is
    // THIS account's own Drive permissions that matter. Under the GitHub
    // Pages shared-code gateway (USER_DEPLOYING), there is no accessing
    // identity at all — every request executes as the deploying owner
    // account instead, which getCurrentUserEmail() correctly reports as ''
    // in that mode. The two cases need different, honest wording below.
    var currentUserEmail = Auth.getCurrentUserEmail();
    var executeAsEmail = currentUserEmail || Auth.getDiagnosticEffectiveEmail() || 'the connected Google account';
    var hasEditorAccess = false;

    try {
      // Direct check: can the file be renamed/modified?
      var currentName = file.getName();
      // Test edit capability safely by setting description or testing edit permission
      var userAccess = file.getAccess(Session.getEffectiveUser());
      if (userAccess === DriveApp.Permission.EDIT || userAccess === DriveApp.Permission.OWNER) {
        hasEditorAccess = true;
      } else {
        // Double check via sharing permission level or try/catch test
        try {
          // Attempting a benign metadata probe
          file.setDescription(file.getDescription() || '');
          hasEditorAccess = true;
        } catch (eProbe) {
          hasEditorAccess = false;
        }
      }
    } catch (e) {
      hasEditorAccess = false;
    }

    if (!hasEditorAccess) {
      var specificErrMsg = currentUserEmail
        ? ("This file isn't editable by your Google account (" + executeAsEmail + ") yet. Make sure you have Editor access to it in Google Drive and try again.")
        : ("This file isn't accessible to the Amlaak system account (" + executeAsEmail + ") yet. Make sure it's shared with Editor access to that account and try again.");
      throw new Error(specificErrMsg);
    }

    return true;
  }

  /**
   * Validates video file existence, supported type, and permissions.
   */
  function validateAndInspectVideoFile(fileId) {
    var file = getFileById(fileId);
    verifyEditorAccess(file);

    var mimeType = file.getMimeType().toLowerCase();
    var fileName = file.getName();
    var ext = NamingService.extractExtension(fileName);

    var validVideoMimes = [
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
      'video/webm', 'video/mpeg', 'video/3gpp', 'application/mp4', 'application/octet-stream'
    ];
    var validVideoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'];

    var isVideoMime = validVideoMimes.indexOf(mimeType) !== -1;
    var isVideoExt = validVideoExts.indexOf(ext) !== -1;

    if (!isVideoMime && !isVideoExt) {
      throw new Error('The selected file is not a valid video file. Current type: ' + mimeType + ' (' + fileName + ')');
    }

    // Section 7.2: Duration & Orientation reliability
    // These fields are commonly empty. Never block save if missing.
    var durationStr = '';
    var orientationStr = '';

    try {
      if (typeof Drive !== 'undefined' && Drive.Files) {
        var meta = Drive.Files.get(fileId, { fields: 'videoMediaMetadata,size' });
        if (meta && meta.videoMediaMetadata) {
          var vMeta = meta.videoMediaMetadata;
          if (vMeta.durationMillis) {
            var totalSecs = Math.round(vMeta.durationMillis / 1000);
            var mins = Math.floor(totalSecs / 60);
            var secs = totalSecs % 60;
            durationStr = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
          }
          if (vMeta.width && vMeta.height) {
            var w = parseInt(vMeta.width, 10);
            var h = parseInt(vMeta.height, 10);
            if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
              orientationStr = (w >= h) ? 'Landscape' : 'Portrait';
            }
          }
        }
      }
    } catch (eMeta) {
      // Fallback gracefully — duration and orientation remain empty string
    }

    return {
      file: file,
      fileId: fileId,
      originalFileName: fileName,
      fileSize: file.getSize(),
      mimeType: mimeType,
      duration: durationStr,
      orientation: orientationStr,
      downloadUrl: file.getUrl()
    };
  }

  /**
   * Renames the original physical file on Google Drive.
   */
  function renameFile(fileId, newName) {
    var file = getFileById(fileId);
    verifyEditorAccess(file);
    var oldName = file.getName();
    var sanitized = Utils.sanitizeFilename(newName);
    if (oldName !== sanitized) {
      file.setName(sanitized);
    }
    return {
      fileId: fileId,
      oldName: oldName,
      newName: sanitized
    };
  }

  /**
   * Moves a file into the destination folder (and removes it from previous parent folders).
   */
  function moveFile(fileId, destinationFolderId) {
    var file = getFileById(fileId);
    var targetFolder = getFolderById(destinationFolderId);

    // Add to target folder
    targetFolder.addFile(file);

    // Remove from existing parent folders
    var parents = file.getParents();
    while (parents.hasNext()) {
      var parent = parents.next();
      if (parent.getId() !== destinationFolderId) {
        parent.removeFile(file);
      }
    }

    return {
      fileId: fileId,
      folderId: destinationFolderId
    };
  }

  /**
   * Uploads base64 PDF data to the Unit Design PDFs folder.
   */
  function uploadDesignPdf(unitId, fileName, base64Content) {
    var folderId = Config.getProperty(Config.KEYS.UNIT_DESIGN_PDFS_FOLDER_ID);
    if (!folderId) {
      throw new Error('The PDF files folder has not been configured (UNIT_DESIGN_PDFS_FOLDER_ID missing).');
    }
    var folder = getFolderById(folderId);

    var cleanName = Utils.sanitizeFilename(fileName || 'Design.pdf');
    if (!cleanName.toLowerCase().endsWith('.pdf')) {
      cleanName += '.pdf';
    }

    // Decode base64
    var decoded = Utilities.base64Decode(base64Content);
    var blob = Utilities.newBlob(decoded, 'application/pdf', cleanName);
    var newFile = folder.createFile(blob);

    return {
      fileId: newFile.getId(),
      fileName: newFile.getName(),
      fileSize: newFile.getSize(),
      url: newFile.getUrl()
    };
  }

  /**
   * Batch renames a list of files with granular progress and error tolerance.
   * Used for Section 2.3 Decision C propagation.
   */
  function batchRenameFiles(renameTasks) {
    var results = {
      successful: [],
      failed: []
    };

    for (var i = 0; i < renameTasks.length; i++) {
      var task = renameTasks[i];
      try {
        var renamed = renameFile(task.fileId, task.proposedName);
        results.successful.push({
          fileId: task.fileId,
          oldName: renamed.oldName,
          newName: renamed.newName,
          entityId: task.entityId || task.fileId
        });
      } catch (e) {
        results.failed.push({
          fileId: task.fileId,
          oldName: task.currentName,
          proposedName: task.proposedName,
          error: e.message || e.toString()
        });
      }
    }

    return results;
  }

  return {
    getFolderById: getFolderById,
    getFileById: getFileById,
    verifyEditorAccess: verifyEditorAccess,
    validateAndInspectVideoFile: validateAndInspectVideoFile,
    renameFile: renameFile,
    moveFile: moveFile,
    uploadDesignPdf: uploadDesignPdf,
    batchRenameFiles: batchRenameFiles
  };
})();
