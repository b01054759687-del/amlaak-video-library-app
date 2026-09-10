/**
 * Amlaak Video Library — Physical File Naming Rules (§12 & Decision A)
 */
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+-\s*|\s*-\s+/g, ' - ')
    .replace(/( - ){2,}/g, ' - ')
    .replace(/^[\s\-]+|[\s\-]+$/g, '')
    .trim();
}

function generateProjectVideoName(p) {
  const parts = [];
  if (p.clientName) parts.push(sanitize(p.clientName));
  if (p.location) parts.push(sanitize(p.location));
  if (p.projectVideoType) parts.push(sanitize(p.projectVideoType));
  if (p.spaceType) parts.push(sanitize(p.spaceType));
  if (p.shootingDate) parts.push(sanitize(p.shootingDate));

  let ver = p.versionNumber || 'V01';
  ver = ver.toUpperCase();
  if (!ver.startsWith('V')) ver = 'V' + ver;
  parts.push(ver);

  // Note: Work Category is strictly EXCLUDED from physical filename (Decision A)
  return parts.join(' - ') + '.mp4';
}

function generateMarketingContentName(p) {
  const parts = [];
  if (p.contentType) parts.push(sanitize(p.contentType));
  if (p.topic) parts.push(sanitize(p.topic));

  const type = p.contentType || '';
  if (type === 'Construction Walkthrough' || type === 'Before / After') {
    if (p.spaceType) parts.push(sanitize(p.spaceType));
  }

  if (p.shootingDate) parts.push(sanitize(p.shootingDate));

  let ver = p.versionNumber || 'V01';
  ver = ver.toUpperCase();
  if (!ver.startsWith('V')) ver = 'V' + ver;
  parts.push(ver);

  return parts.join(' - ') + '.mp4';
}

module.exports = {
  sanitize,
  generateProjectVideoName,
  generateMarketingContentName
};
