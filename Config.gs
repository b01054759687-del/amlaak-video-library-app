/**
 * Amlaak Video Library — Configuration & Global Constants
 * Manages system properties, sheet tab definitions, and controlled taxonomies.
 */

var Config = (function() {
  var PROPERTY_KEYS = {
    SPREADSHEET_ID: 'SPREADSHEET_ID',
    ROOT_FOLDER_ID: 'ROOT_FOLDER_ID',
    PROJECT_VIDEOS_FOLDER_ID: 'PROJECT_VIDEOS_FOLDER_ID',
    MARKETING_CONTENT_FOLDER_ID: 'MARKETING_CONTENT_FOLDER_ID',
    UNIT_DESIGN_PDFS_FOLDER_ID: 'UNIT_DESIGN_PDFS_FOLDER_ID',
    TIMEZONE: 'TIMEZONE',
    SYSTEM_INITIALIZED: 'SYSTEM_INITIALIZED'
  };

  var TABS = {
    UNITS: 'Units',
    VIDEOS: 'Video Versions',
    PDFS: 'Unit Design PDFs',
    LISTS: 'Lists',
    USERS: 'Authorised Users',
    AUDIT: 'Audit Log',
    CONFIG: 'System Config'
  };

  var FOLDERS = {
    ROOT: 'Amlaak Video Library',
    PROJECT_VIDEOS: 'Project Videos',
    MARKETING_CONTENT: 'Marketing Content',
    UNIT_DESIGN_PDFS: 'Unit Design PDFs'
  };

  // Section 8 Approved Taxonomies
  var DEFAULT_TAXONOMIES = {
    videoSource: [
      'Project Video',
      'Marketing Content'
    ],
    unitType: [
      'Apartment',
      'Studio',
      'Duplex',
      'Penthouse',
      'Roof Apartment',
      'Standalone Villa',
      'Twin House',
      'Townhouse',
      'Chalet',
      'Cabin',
      'Office',
      'Clinic',
      'Retail / Commercial Unit',
      'Restaurant / Café',
      'Other'
    ],
    projectVideoType: [
      'Red Brick',
      'Phase 1',
      'Phase 2',
      'Final',
      'Final with Furniture',
      'Client Interview',
      'Before & After'
    ],
    spaceType: [
      'Full Unit',
      'Reception',
      'Kitchen',
      'Bathroom',
      'Bedroom',
      'Dressing Room',
      'Entrance',
      'Terrace',
      'Garden',
      'Multiple Spaces',
      'Other'
    ],
    marketingContentType: [
      'Educational',
      'Demonstration',
      'Testimonial',
      'Sales',
      'Offer',
      'Other'
    ],
    // Section 8.6 Work Category (Decision A - Confirmed separate field)
    workCategory: [
      'Roof',
      'Ceiling',
      'Materials',
      'Furniture',
      'Decoration',
      'HDF',
      'Ceramics',
      'Electrical',
      'Gypsum Board',
      'Air Conditioning',
      'Sound System',
      'Doors',
      'Windows',
      'Painting',
      'Plastering'
    ]
  };

  function getProperty(key, optDefault) {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    return (val !== null && val !== undefined && val !== '') ? val : (optDefault || '');
  }

  function setProperty(key, value) {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(key, String(value));
  }

  function setProperties(obj) {
    var props = PropertiesService.getScriptProperties();
    props.setProperties(obj);
  }

  function getAllProperties() {
    var props = PropertiesService.getScriptProperties();
    return props.getProperties();
  }

  return {
    KEYS: PROPERTY_KEYS,
    TABS: TABS,
    FOLDERS: FOLDERS,
    TAXONOMIES: DEFAULT_TAXONOMIES,
    getProperty: getProperty,
    setProperty: setProperty,
    setProperties: setProperties,
    getAllProperties: getAllProperties,
    getTimezone: function() {
      return getProperty(PROPERTY_KEYS.TIMEZONE, 'Africa/Cairo');
    }
  };
})();
