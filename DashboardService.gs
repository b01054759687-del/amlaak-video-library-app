/**
 * Amlaak Video Library — Dashboard Service
 * Calculates accurate BI metrics and breakdown distributions according to Section 19.
 */

var DashboardService = (function() {
  function getDashboardData(filters) {
    Auth.requireAuth();

    var allVideoRows = SheetRepository.getAllVideoVersions();
    var allUnits = SheetRepository.getAllUnits();
    var allPdfs = SheetRepository.getAllPdfs();

    var dateFilterType = (filters && filters.dateFilterType) || 'Added Date';
    var startDate = (filters && filters.startDate) || '';
    var endDate = (filters && filters.endDate) || '';

    // Filter rows based on date range
    var matchingRows = [];
    for (var i = 0; i < allVideoRows.length; i++) {
      var row = allVideoRows[i];
      if (startDate || endDate) {
        var dateField = (dateFilterType === 'Shooting Date') ? 'Shooting Date' : 'Added Date';
        var dVal = row[dateField];
        if (dVal) {
          var norm = Utils.normalizeDateString(dVal);
          if (startDate && norm < startDate) continue;
          if (endDate && norm > endDate) continue;
        } else {
          continue;
        }
      }
      matchingRows.push(row);
    }

    // 1. Calculate Logical Videos & Stored Versions
    var distinctLogicalVideos = {};
    var projectLogicalVideos = {};
    var marketingLogicalVideos = {};
    var projectVersionsCount = 0;
    var marketingVersionsCount = 0;

    for (var j = 0; j < matchingRows.length; j++) {
      var r = matchingRows[j];
      var vNum = r['Video Number'];
      var src = r['Video Source'];

      if (vNum) {
        distinctLogicalVideos[vNum] = true;
        if (src === 'Project Video') {
          projectLogicalVideos[vNum] = true;
          projectVersionsCount++;
        } else if (src === 'Marketing Content') {
          marketingLogicalVideos[vNum] = true;
          marketingVersionsCount++;
        }
      }
    }

    var totalLogicalVideos = Object.keys(distinctLogicalVideos).length;
    var totalStoredVersions = matchingRows.length;
    var totalProjectVideos = Object.keys(projectLogicalVideos).length;
    var totalMarketingContent = Object.keys(marketingLogicalVideos).length;

    // 2. Distributions & Breakdowns (calculated per logical video to avoid version skew)
    var locationDist = {};
    var stageDist = {};
    var spaceDist = {};
    var workCategoryDist = {}; // Decision A
    var timelineDist = {};

    var seenLogicalForBreakdown = {};

    for (var k = 0; k < matchingRows.length; k++) {
      var item = matchingRows[k];
      var numKey = item['Video Number'];
      var isCurrent = String(item['Is Current Version']).toLowerCase() === 'yes';

      // Use current version for logical attribute breakdown, or first matching
      if (!seenLogicalForBreakdown[numKey] || isCurrent) {
        seenLogicalForBreakdown[numKey] = item;
      }

      // Timeline can track versions added or shooting
      var dateFieldVal = (dateFilterType === 'Shooting Date') ? item['Shooting Date'] : item['Added Date'];
      if (dateFieldVal) {
        var monthKey = Utils.normalizeDateString(dateFieldVal).substring(0, 7); // YYYY-MM
        if (monthKey && monthKey.length === 7) {
          timelineDist[monthKey] = (timelineDist[monthKey] || 0) + 1;
        }
      }
    }

    for (var lKey in seenLogicalForBreakdown) {
      var lItem = seenLogicalForBreakdown[lKey];

      // Location
      var loc = Utils.normalizeLocation(lItem['Location']);
      if (loc) {
        locationDist[loc] = (locationDist[loc] || 0) + 1;
      }

      // Project Stage (Project Video Type)
      var stage = (lItem['Project Video Type'] || '').trim();
      if (stage) {
        stageDist[stage] = (stageDist[stage] || 0) + 1;
      }

      // Space Type
      var space = (lItem['Space Type'] || '').trim();
      if (space) {
        spaceDist[space] = (spaceDist[space] || 0) + 1;
      }

      // Work Category (Decision A - Confirmed)
      var workCat = (lItem['Work Category'] || '').trim();
      if (workCat) {
        workCategoryDist[workCat] = (workCategoryDist[workCat] || 0) + 1;
      }
    }

    // Convert distributions to sorted array
    function toSortedArray(obj) {
      var arr = [];
      for (var key in obj) {
        arr.push({ name: key, count: obj[key] });
      }
      return arr.sort(function(a, b) { return b.count - a.count; });
    }

    // 3. Recent Activity (Latest from Audit Log, or latest videos)
    var recentActivity = [];
    try {
      var auditRows = SheetRepository.getAllRowsAsObjects(Config.TABS.AUDIT);
      for (var a = auditRows.length - 1; a >= 0 && recentActivity.length < 8; a--) {
        recentActivity.push({
          timestamp: auditRows[a]['Timestamp'],
          user: auditRows[a]['User'],
          action: auditRows[a]['Action'],
          entityId: auditRows[a]['Entity ID'],
          message: auditRows[a]['Safe Message']
        });
      }
    } catch (eAudit) {
      // ignore
    }

    return {
      kpis: {
        totalLogicalVideos: totalLogicalVideos,
        totalStoredVersions: totalStoredVersions,
        totalProjectVideos: totalProjectVideos,
        projectVersionsCount: projectVersionsCount,
        totalMarketingContent: totalMarketingContent,
        marketingVersionsCount: marketingVersionsCount,
        totalUnits: allUnits.length,
        totalStoredPdfs: allPdfs.length
      },
      breakdowns: {
        locations: toSortedArray(locationDist),
        stages: toSortedArray(stageDist),
        spaces: toSortedArray(spaceDist),
        workCategories: toSortedArray(workCategoryDist), // Decision A
        timeline: timelineDist
      },
      recentActivity: recentActivity,
      filterContext: {
        dateFilterType: dateFilterType,
        startDate: startDate,
        endDate: endDate
      }
    };
  }

  return {
    getDashboardData: getDashboardData
  };
})();
