/**
 * Minimal static file server for local browser QA only.
 * Serves tests/.preview/ so the harness can be opened in a real browser tab.
 * Not used by build-dist.js and not part of the Apps Script deployment.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '.preview');
const port = process.env.PORT || 4173;

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
}).listen(port, () => console.log('Preview server on http://localhost:' + port));
