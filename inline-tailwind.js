/**
 * One-off build step: inline the precompiled tailwind-output.css into
 * Index.html, replacing the runtime Tailwind Play CDN <script> tag.
 * Run once after regenerating tailwind-output.css; not part of the
 * normal build-dist.js pipeline (Tailwind only needs recompiling when
 * class usage in Index.html/Client.html/Styles.html changes).
 */
const fs = require('fs');

const indexPath = 'Index.html';
const cssPath = 'tailwind-output.css';

const html = fs.readFileSync(indexPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

const marker = '<script src="https://cdn.tailwindcss.com"></script>';
if (!html.includes(marker)) {
  console.error('Marker not found — Index.html may have already been updated.');
  process.exit(1);
}

const replacement = '<style>/* Precompiled Tailwind CSS (tailwind-output.css) — replaces the runtime Play CDN for faster first paint. Regenerate with: npx tailwindcss -i tailwind-input.css -o tailwind-output.css --minify */\n' + css + '</style>';

const updated = html.replace(marker, replacement);
fs.writeFileSync(indexPath, updated, 'utf8');
console.log('Inlined ' + css.length + ' bytes of precompiled Tailwind CSS into ' + indexPath);
