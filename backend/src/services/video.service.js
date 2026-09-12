/**
 * Video Service — Library Filtering, Versions & Renaming (§2, §3, §4, §6, §12)
 */
const sheetsService = require('./sheets.service');
const auditService = require('./audit.service');
const namingService = require('../utils/naming');
const { validateProjectVideo, validateMarketingContent } = require('../utils/validators');

async function getLibraryVideos(filters = {}) {
  const allVideos = await sheetsService.getVideos();
  let filtered = allVideos;

  // Filter: Current version by default
  const includePrev = filters.includePreviousVersions === true || filters.includePreviousVersions === 'true';
  if (!includePrev) {
    filtered = filtered.filter(v => v.isCurrentVersion);
  }

  // Filter: Source
  if (filters.videoSource) {
    filtered = filtered.filter(v => v.videoSource === filters.videoSource);
  }

  // Filter: Content Type
  if (filters.contentType) {
    filtered = filtered.filter(v => v.contentType === filters.contentType);
  }

  // Filter: Project Video Type
  if (filters.projectVideoType) {
    filtered = filtered.filter(v => v.projectVideoType === filters.projectVideoType);
  }

  // Filter: Space Type
  if (filters.spaceType) {
    filtered = filtered.filter(v => v.spaceType === filters.spaceType);
  }

  // Filter: Work Category
  if (filters.workCategory) {
    filtered = filtered.filter(v => v.workCategory === filters.workCategory);
  }

  // Filter: Location
  if (filters.location) {
    filtered = filtered.filter(v => v.location && v.location.toLowerCase().includes(filters.location.toLowerCase()));
  }

  // Filter: Unit Type
  if (filters.unitType) {
    filtered = filtered.filter(v => v.unitType === filters.unitType);
  }

  // Filter: Area range
  if (filters.areaMin !== undefined && filters.areaMin !== '') {
    filtered = filtered.filter(v => v.area && Number(v.area) >= Number(filters.areaMin));
  }
  if (filters.areaMax !== undefined && filters.areaMax !== '') {
    filtered = filtered.filter(v => v.area && Number(v.area) <= Number(filters.areaMax));
  }

  // Filter: Search Query
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(v => {
      return (v.clientName && v.clientName.toLowerCase().includes(q)) ||
             (v.topic && v.topic.toLowerCase().includes(q)) ||
             (v.videoName && v.videoName.toLowerCase().includes(q)) ||
             (v.videoNumber && v.videoNumber.includes(q)) ||
             (v.unitId && v.unitId.toLowerCase().includes(q));
    });
  }

  // Server-side pagination (§6)
  const totalCount = filtered.length;
  const page = parseInt(filters.page, 10) || 1;
  const pageSize = parseInt(filters.pageSize, 10) || 25;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasMore: (startIndex + pageSize) < totalCount
  };
}

async function getVideoVersionHistory(videoNumber) {
  const versions = await sheetsService.getVideoVersions(videoNumber);
  if (versions.length === 0) {
    throw new Error('No versions found for Video ' + videoNumber);
  }

  // Sort descending
  versions.sort((a, b) => {
    const vA = parseInt(String(a.versionNumber).replace(/\D/g, ''), 10) || 0;
    const vB = parseInt(String(b.versionNumber).replace(/\D/g, ''), 10) || 0;
    return vB - vA;
  });

  // Guarantee single current version
  let currentFound = false;
  versions.forEach(v => {
    if (v.isCurrentVersion) {
      if (!currentFound) currentFound = true;
      else v.isCurrentVersion = false;
    }
  });
  if (!currentFound && versions.length > 0) {
    versions[0].isCurrentVersion = true;
  }

  const currentVer = versions.find(v => v.isCurrentVersion) || versions[0];

  return {
    videoNumber,
    title: currentVer.clientName || currentVer.topic || ('Video ' + videoNumber),
    videoSource: currentVer.videoSource,
    currentVersion: currentVer,
    totalVersions: versions.length,
    versions
  };
}

async function addProjectVideo(payload, user) {
  const v = validateProjectVideo(payload);
  if (!v.isValid) throw new Error(v.error);

  // Check duplicate Drive File ID
  const existing = await sheetsService.getVideoByDriveFileId(v.fileId);
  if (existing) throw new Error('Google Drive file is already registered in Video ' + existing.videoNumber);

  // Allocate next Video Number
  const allVids = await sheetsService.getVideos();
  let maxV = 0;
  allVids.forEach(vid => {
    const n = parseInt(String(vid.videoNumber).replace(/\D/g, ''), 10);
    if (n > maxV) maxV = n;
  });
  const nextVideoNumber = String(maxV + 1).padStart(4, '0');

  const videoName = namingService.generateProjectVideoName({
    clientName: payload.clientName,
    location: payload.location,
    projectVideoType: payload.projectVideoType,
    spaceType: payload.spaceType,
    shootingDate: payload.shootingDate,
    versionNumber: 'V01'
  });

  const record = {
    videoNumber: nextVideoNumber,
    versionNumber: 'V01',
    isCurrentVersion: true,
    videoSource: 'Project Video',
    unitId: payload.unitId || '',
    clientName: payload.clientName.trim(),
    location: payload.location.trim(),
    unitType: payload.unitType || '',
    area: payload.area || '',
    projectVideoType: payload.projectVideoType,
    spaceType: payload.spaceType,
    workCategory: '', // Work Category is a Marketing Content field, not Project Video
    shootingDate: payload.shootingDate,
    videoName: videoName,
    driveFileId: v.fileId,
    versionNotes: payload.versionNotes || '',
    addedDate: new Date().toISOString().split('T')[0],
    addedBy: user ? user.email : 'system'
  };

  await sheetsService.addVideo(record);
  await auditService.logAction('ADD_PROJECT_VIDEO', 'Video', nextVideoNumber, user, `Saved ${videoName}`);

  return { video: record };
}

async function addMarketingContent(payload, user) {
  const v = validateMarketingContent(payload);
  if (!v.isValid) throw new Error(v.error);

  const existing = await sheetsService.getVideoByDriveFileId(v.fileId);
  if (existing) throw new Error('Google Drive file is already registered in Video ' + existing.videoNumber);

  const allVids = await sheetsService.getVideos();
  let maxV = 0;
  allVids.forEach(vid => {
    const n = parseInt(String(vid.videoNumber).replace(/\D/g, ''), 10);
    if (n > maxV) maxV = n;
  });
  const nextVideoNumber = String(maxV + 1).padStart(4, '0');

  const videoName = namingService.generateMarketingContentName({
    contentType: payload.contentType,
    topic: payload.topic,
    spaceType: payload.spaceType,
    shootingDate: payload.shootingDate,
    versionNumber: 'V01'
  });

  const record = {
    videoNumber: nextVideoNumber,
    versionNumber: 'V01',
    isCurrentVersion: true,
    videoSource: 'Marketing Content',
    unitId: '',
    contentType: payload.contentType,
    topic: payload.topic.trim(),
    spaceType: payload.spaceType || '',
    workCategory: payload.workCategory || '',
    shootingDate: payload.shootingDate,
    videoName: videoName,
    driveFileId: v.fileId,
    versionNotes: payload.versionNotes || '',
    addedDate: new Date().toISOString().split('T')[0],
    addedBy: user ? user.email : 'system'
  };

  await sheetsService.addVideo(record);
  await auditService.logAction('ADD_MARKETING_CONTENT', 'Video', nextVideoNumber, user, `Saved ${videoName}`);

  return { video: record };
}

async function addNewVersion(payload, user) {
  const vNum = payload.videoNumber;
  if (!vNum) throw new Error('Video Number is required');

  const fileId = payload.driveFileId || (payload.videoLink ? payload.videoLink.match(/[a-zA-Z0-9_-]{20,}/)?.[0] : null);
  if (!fileId) throw new Error('Valid Google Drive file ID is required');

  const dup = await sheetsService.getVideoByDriveFileId(fileId);
  if (dup) throw new Error('Drive file ID already in use: ' + fileId);

  const versions = await sheetsService.getVideoVersions(vNum);
  if (versions.length === 0) throw new Error('Base video not found: ' + vNum);

  const currentVer = versions.find(v => v.isCurrentVersion) || versions[0];

  let maxVer = 0;
  versions.forEach(v => {
    const m = String(v.versionNumber).match(/V?(\d+)/i);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (n > maxVer) maxVer = n;
    }
  });

  const nextVerStr = 'V' + String(maxVer + 1).padStart(2, '0');

  // Flip old current versions to false
  versions.forEach(async (v) => {
    if (v.isCurrentVersion) {
      await sheetsService.updateVideo(v.driveFileId, { isCurrentVersion: false });
    }
  });

  const isProject = currentVer.videoSource === 'Project Video';
  const newName = isProject
    ? namingService.generateProjectVideoName({
        clientName: currentVer.clientName,
        location: currentVer.location,
        projectVideoType: currentVer.projectVideoType,
        spaceType: currentVer.spaceType,
        shootingDate: currentVer.shootingDate,
        versionNumber: nextVerStr
      })
    : namingService.generateMarketingContentName({
        contentType: currentVer.contentType,
        topic: currentVer.topic,
        spaceType: currentVer.spaceType,
        shootingDate: currentVer.shootingDate,
        versionNumber: nextVerStr
      });

  const newRecord = {
    ...currentVer,
    versionNumber: nextVerStr,
    isCurrentVersion: true,
    videoName: newName,
    driveFileId: fileId,
    versionNotes: payload.versionNotes || '',
    addedDate: new Date().toISOString().split('T')[0],
    addedBy: user ? user.email : 'system'
  };

  await sheetsService.addVideo(newRecord);
  await auditService.logAction('ADD_VERSION', 'Video', vNum, user, `Added ${nextVerStr} as ${newName}`);

  return newRecord;
}

async function updateSingleVideoMetadata(driveFileId, updatedFields, optConfirmRename, user) {
  const existing = await sheetsService.getVideoByDriveFileId(driveFileId);
  if (!existing) throw new Error('Video not found with file ID: ' + driveFileId);

  const isProject = existing.videoSource === 'Project Video';
  const proposedName = isProject
    ? namingService.generateProjectVideoName({
        clientName: updatedFields.clientName !== undefined ? updatedFields.clientName : existing.clientName,
        location: updatedFields.location !== undefined ? updatedFields.location : existing.location,
        projectVideoType: updatedFields.projectVideoType !== undefined ? updatedFields.projectVideoType : existing.projectVideoType,
        spaceType: updatedFields.spaceType !== undefined ? updatedFields.spaceType : existing.spaceType,
        shootingDate: updatedFields.shootingDate !== undefined ? updatedFields.shootingDate : existing.shootingDate,
        versionNumber: existing.versionNumber
      })
    : namingService.generateMarketingContentName({
        contentType: updatedFields.contentType !== undefined ? updatedFields.contentType : existing.contentType,
        topic: updatedFields.topic !== undefined ? updatedFields.topic : existing.topic,
        spaceType: updatedFields.spaceType !== undefined ? updatedFields.spaceType : existing.spaceType,
        shootingDate: updatedFields.shootingDate !== undefined ? updatedFields.shootingDate : existing.shootingDate,
        versionNumber: existing.versionNumber
      });

  const nameChanged = (proposedName !== existing.videoName);
  if (nameChanged && !optConfirmRename) {
    return {
      requiresRenameConfirmation: true,
      currentName: existing.videoName,
      proposedName: proposedName,
      message: 'Editing changes standard naming attributes. Confirmation is required to rename the Drive file.'
    };
  }

  const sheetUpdates = {
    ...updatedFields,
    videoName: proposedName
  };

  await sheetsService.updateVideo(driveFileId, sheetUpdates);
  await auditService.logAction('UPDATE_METADATA', 'Video', existing.videoNumber, user, `Updated metadata to ${proposedName}`);

  return {
    success: true,
    renamed: nameChanged,
    newName: proposedName
  };
}

module.exports = {
  getLibraryVideos,
  getVideoVersionHistory,
  addProjectVideo,
  addMarketingContent,
  addNewVersion,
  updateSingleVideoMetadata
};
