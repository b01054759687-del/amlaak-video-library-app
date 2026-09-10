/**
 * Reactive Application Store
 */
export const AppState = {
  currentUser: null,
  isConfigured: false,
  isBootstrapped: false,
  currentTab: 'dashboard',
  lists: {
    unitType: [],
    projectVideoType: [],
    spaceType: [],
    marketingContentType: [],
    workCategory: [],
    locations: []
  },
  allVideos: [],
  allUnits: [],
  unitLookups: [],
  activeUnitDetail: null,
  activeEditingVideo: null,
  activeVideoForVersion: null,
  dashboardLoaded: false,
  pendingUnitEdit: null,
  
  // Request Sequence IDs (§9)
  searchRequestId: 0,
  dashboardRequestId: 0,
  unitsRequestId: 0,

  // Pagination State (§6)
  libraryPage: 1,
  libraryPageSize: 25,
  libraryTotalPages: 1
};
