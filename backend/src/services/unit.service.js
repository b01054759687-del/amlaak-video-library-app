/**
 * Unit Management & Central Propagation Service (§1, §7, §13)
 */
const sheetsService = require('./sheets.service');
const auditService = require('./audit.service');
const { validateUnit } = require('../utils/validators');

async function getUnits() {
  const units = await sheetsService.getUnits();
  const videos = await sheetsService.getVideos();
  const pdfs = sheetsService.pdfs;

  return units.map(u => ({
    ...u,
    videoCount: videos.filter(v => v.unitId === u.unitId).length,
    pdfCount: pdfs.filter(p => p.unitId === u.unitId).length
  }));
}

async function getUnitDetail(unitId) {
  const unit = await sheetsService.getUnitById(unitId);
  if (!unit) throw new Error('Unit not found: ' + unitId);

  const allVids = await sheetsService.getVideos();
  const unitVids = allVids.filter(v => v.unitId === unitId);

  // Group by videoNumber
  const videoGroups = {};
  unitVids.forEach(v => {
    if (!videoGroups[v.videoNumber]) {
      videoGroups[v.videoNumber] = {
        videoNumber: v.videoNumber,
        projectVideoType: v.projectVideoType,
        spaceType: v.spaceType,
        workCategory: v.workCategory,
        versions: []
      };
    }
    videoGroups[v.videoNumber].versions.push(v);
  });

  const videosResult = Object.values(videoGroups).map(g => {
    g.versions.sort((a, b) => {
      const vA = parseInt(String(a.versionNumber).replace(/\D/g, ''), 10) || 0;
      const vB = parseInt(String(b.versionNumber).replace(/\D/g, ''), 10) || 0;
      return vB - vA;
    });
    return {
      ...g,
      currentVersion: g.versions.find(v => v.isCurrentVersion) || g.versions[0]
    };
  });

  const unitPdfs = await sheetsService.getPdfsByUnitId(unitId);

  return {
    unit: {
      ...unit,
      videoCount: unitVids.length,
      pdfCount: unitPdfs.length
    },
    videos: videosResult,
    pdfs: unitPdfs
  };
}

async function createUnit(payload, user) {
  const v = validateUnit(payload);
  if (!v.isValid) throw new Error(v.error);

  const allUnits = await sheetsService.getUnits();
  let maxId = 0;
  allUnits.forEach(u => {
    const match = String(u.unitId).match(/U-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  });

  const nextNum = maxId + 1;
  const newUnitId = 'U-' + String(nextNum).padStart(4, '0');

  const newUnit = {
    unitId: newUnitId,
    clientName: payload.clientName.trim(),
    location: payload.location.trim(),
    unitType: payload.unitType.trim(),
    area: payload.area ? parseFloat(payload.area) : '',
    createdDate: new Date().toISOString().split('T')[0],
    createdBy: user ? user.email : 'system'
  };

  await sheetsService.addUnit(newUnit);
  await auditService.logAction('CREATE_UNIT', 'Unit', newUnitId, user, `Created unit for ${newUnit.clientName}`);

  return newUnit;
}

async function updateUnit(unitId, fields, executeBatchRename, user) {
  const existing = await sheetsService.getUnitById(unitId);
  if (!existing) throw new Error('Unit not found: ' + unitId);

  const updated = await sheetsService.updateUnit(unitId, fields);
  await auditService.logAction('UPDATE_UNIT', 'Unit', unitId, user, `Updated master metadata`);

  return updated;
}

module.exports = {
  getUnits,
  getUnitDetail,
  createUnit,
  updateUnit
};
