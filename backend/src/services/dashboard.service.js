/**
 * Dashboard & KPI Metrics Aggregator (§14)
 */
const sheetsService = require('./sheets.service');

async function getDashboardData(filters = {}) {
  const videos = await sheetsService.getVideos();
  const units = await sheetsService.getUnits();
  const pdfs = await sheetsService.getPdfsByUnitId(''); // all pdfs in memory

  // Count distinct logical videos
  const logicalMap = new Map();
  videos.forEach(v => {
    if (!logicalMap.has(v.videoNumber)) {
      logicalMap.set(v.videoNumber, v);
    }
  });

  const projectLogical = Array.from(logicalMap.values()).filter(v => v.videoSource === 'Project Video').length;
  const marketingLogical = Array.from(logicalMap.values()).filter(v => v.videoSource === 'Marketing Content').length;

  const projectVersions = videos.filter(v => v.videoSource === 'Project Video').length;
  const marketingVersions = videos.filter(v => v.videoSource === 'Marketing Content').length;

  // Breakdowns
  const locationMap = {};
  const stageMap = {};
  const spaceMap = {};
  const workCatMap = {};

  videos.forEach(v => {
    if (v.location) locationMap[v.location] = (locationMap[v.location] || 0) + 1;
    if (v.projectVideoType) stageMap[v.projectVideoType] = (stageMap[v.projectVideoType] || 0) + 1;
    if (v.spaceType) spaceMap[v.spaceType] = (spaceMap[v.spaceType] || 0) + 1;
    if (v.workCategory) workCatMap[v.workCategory] = (workCatMap[v.workCategory] || 0) + 1;
  });

  const toList = (map) => Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const audits = await sheetsService.getAuditLog(6);

  return {
    kpis: {
      totalLogicalVideos: logicalMap.size,
      totalStoredVersions: videos.length,
      totalProjectVideos: projectLogical,
      projectVersionsCount: projectVersions,
      totalMarketingContent: marketingLogical,
      marketingVersionsCount: marketingVersions,
      totalUnits: units.length,
      totalStoredPdfs: sheetsService.pdfs.length
    },
    breakdowns: {
      locations: toList(locationMap),
      stages: toList(stageMap),
      spaces: toList(spaceMap),
      workCategories: toList(workCatMap)
    },
    recentActivity: audits.map(a => ({
      message: `${a.action} on ${a.entityType} ${a.entityId || ''}`.trim(),
      user: a.user,
      timestamp: a.timestamp,
      action: a.action
    }))
  };
}

module.exports = { getDashboardData };
