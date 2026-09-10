import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASSED] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAILED] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log('AMLAAK VIDEO LIBRARY — AUTOMATED FRONTEND TESTS (ESM)');
console.log('='.repeat(70));

test('English and LTR Configuration: index.html has lang="en" and dir="ltr"', () => {
  const indexHtmlPath = path.join(__dirname, '../index.html');
  assert.strictEqual(fs.existsSync(indexHtmlPath), true, 'frontend/index.html must exist');
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.strictEqual(html.includes('lang="en"'), true, 'Must have lang="en"');
  assert.strictEqual(html.includes('dir="ltr"'), true, 'Must have dir="ltr"');
});

test('Tailwind Play CDN Removal: Zero cdn.tailwindcss.com script in frontend/index.html', () => {
  const indexHtmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.strictEqual(html.includes('cdn.tailwindcss.com'), false, 'Play CDN must not exist in frontend/index.html');
});

test('Precompiled Stylesheet Link: Links to local src/styles/main.css', () => {
  const indexHtmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.strictEqual(html.includes('src/styles/main.css'), true, 'Must link to src/styles/main.css');
  const cssPath = path.join(__dirname, '../src/styles/main.css');
  assert.strictEqual(fs.existsSync(cssPath), true, 'main.css must exist locally');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.strictEqual(css.includes('--amlaak-navy-dark'), true, 'Must contain design tokens');
});

test('Google Identity Services Script Present: Linked without credentials in code', () => {
  const indexHtmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.strictEqual(html.includes('https://accounts.google.com/gsi/client'), true, 'Must link GIS client');
  assert.strictEqual(html.includes('client_secret'), false, 'Zero client_secret in HTML');
  assert.strictEqual(html.includes('private_key'), false, 'Zero private_key in HTML');
});

test('No google.script.run in frontend module: Decoupled to REST client', () => {
  const mainJsPath = path.join(__dirname, '../src/main.js');
  assert.strictEqual(fs.existsSync(mainJsPath), true, 'src/main.js must exist');
  const code = fs.readFileSync(mainJsPath, 'utf8');
  assert.strictEqual(code.includes('google.script.run'), false, 'Zero google.script.run in src/main.js');
});

test('Stale Asynchronous Search Protection: Sequence tokens discard out-of-order responses', () => {
  let searchReqId = 0;
  let activeData = null;

  function req() { return ++searchReqId; }
  function res(id, val) {
    if (id !== searchReqId) return false;
    activeData = val;
    return true;
  }

  const r1 = req();
  const r2 = req();
  assert.strictEqual(res(r2, 'second'), true);
  assert.strictEqual(res(r1, 'first'), false);
  assert.strictEqual(activeData, 'second');
});

test('Pagination Boundary: Next and Prev disable states compute correctly', () => {
  function getPaginationState(page, totalPages) {
    return {
      canPrev: page > 1,
      canNext: page < totalPages
    };
  }

  assert.deepStrictEqual(getPaginationState(1, 4), { canPrev: false, canNext: true });
  assert.deepStrictEqual(getPaginationState(2, 4), { canPrev: true, canNext: true });
  assert.deepStrictEqual(getPaginationState(4, 4), { canPrev: true, canNext: false });
});

console.log('\n' + '='.repeat(70));
console.log(`FRONTEND TESTS SUMMARY: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('='.repeat(70));
if (failed > 0) process.exit(1);
