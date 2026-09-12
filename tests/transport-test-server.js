/**
 * Minimal static file server for the GitHub Pages transport feasibility test.
 * Serves tests/.transport-test/ on a different origin (localhost) than
 * script.google.com, to genuinely exercise browser CORS behaviour.
 * Not used by build-dist.js and not part of the Apps Script deployment.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '.transport-test');
const port = process.env.PORT || 4174;

const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

http.createServer((req, res) => {
  let filePath = path.join(root, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
}).listen(port, () => console.log('Transport test server on http://localhost:' + port));
