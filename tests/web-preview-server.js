/**
 * Minimal static file server for previewing the real GitHub Pages frontend
 * (web/) locally, on a different origin than script.google.com, so its
 * fetch() calls to the Apps Script gateway exercise genuine cross-origin
 * behaviour. Not used by build-dist.js and not part of the Apps Script
 * deployment - this serves web/ directly, unmodified.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'web');
const port = process.env.PORT || 4175;

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
}).listen(port, () => console.log('web/ preview server on http://localhost:' + port));
