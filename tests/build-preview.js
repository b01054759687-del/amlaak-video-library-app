/**
 * Amlaak Video Library — local browser QA harness builder.
 *
 * Assembles a throwaway copy of the app (same include-substitution as
 * build-dist.js) under tests/.preview/index.html, with tests/preview-mocks.js
 * injected right after <body>. This lets the real UI be exercised in a plain
 * Chrome tab without google.script.run — for LOCAL QA ONLY.
 *
 * tests/.preview/ is gitignored and never referenced by build-dist.js or
 * appsscript.json, so nothing here reaches dist/ or the Apps Script deployment.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');
const previewDir = path.join(__dirname, '.preview');

if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

let indexHtml = fs.readFileSync(path.join(srcDir, 'Index.html'), 'utf8');
const stylesHtml = fs.readFileSync(path.join(srcDir, 'Styles.html'), 'utf8');
const clientHtml = fs.readFileSync(path.join(srcDir, 'Client.html'), 'utf8');

let previewHtml = indexHtml
  .replace("<?!= include('Styles'); ?>", stylesHtml)
  .replace("<?!= include('Client'); ?>", clientHtml)
  .replace('<body', '<body data-test-harness="true"')
  .replace('</head>', '  <script src="preview-mocks.js"></script>\n</head>');

fs.writeFileSync(path.join(previewDir, 'index.html'), previewHtml, 'utf8');
fs.copyFileSync(path.join(__dirname, 'preview-mocks.js'), path.join(previewDir, 'preview-mocks.js'));

console.log('Local QA preview built at tests/.preview/index.html (open it directly in a browser).');
