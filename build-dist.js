const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const distDir = path.join(srcDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building bundled production files for fast deployment...');

// 1. Bundle Server .gs files
const serverFiles = [
  'Config.gs',
  'Utils.gs',
  'Validators.gs',
  'NamingService.gs',
  'Auth.gs',
  'GatewaySession.gs',
  'AuditService.gs',
  'SheetRepository.gs',
  'DriveService.gs',
  'UnitService.gs',
  'VideoService.gs',
  'PdfService.gs',
  'DashboardService.gs',
  'Setup.gs',
  'Gateway.gs',
  'Code.gs'
];

let bundledGs = '/**\n * Amlaak Video Library — Bundled Production Engine v2.0\n * Auto-generated bundle for instant single-file Apps Script deployment.\n */\n\n';

for (const file of serverFiles) {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    bundledGs += `// ==========================================\n// FILE: ${file}\n// ==========================================\n`;
    bundledGs += fs.readFileSync(filePath, 'utf8') + '\n\n';
  }
}

fs.writeFileSync(path.join(distDir, 'Code.gs'), bundledGs, 'utf8');
console.log('  ✓ Generated dist/Code.gs');

// 2. Bundle Client HTML (inline Styles.html and Client.html into Index.html)
let indexHtml = fs.readFileSync(path.join(srcDir, 'Index.html'), 'utf8');
const stylesHtml = fs.readFileSync(path.join(srcDir, 'Styles.html'), 'utf8');
const clientHtml = fs.readFileSync(path.join(srcDir, 'Client.html'), 'utf8');

let bundledHtml = indexHtml
  .replace("<?!= include('Styles'); ?>", stylesHtml)
  .replace("<?!= include('Client'); ?>", clientHtml);

fs.writeFileSync(path.join(distDir, 'Index.html'), bundledHtml, 'utf8');
console.log('  ✓ Generated dist/Index.html');

// 3. Copy appsscript.json
fs.copyFileSync(path.join(srcDir, 'appsscript.json'), path.join(distDir, 'appsscript.json'));
console.log('  ✓ Copied dist/appsscript.json');

console.log('\nBuild complete! The dist/ directory contains ready-to-paste files for 60-second Apps Script deployment.');
