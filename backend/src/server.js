/**
 * Amlaak Video Library — Secure Cloud Run API Server
 * Built with native Node.js HTTP + Express compatibility layer
 */
const http = require('http');
const url = require('url');
const config = require('./config');
const { success, error } = require('./utils/response');
const corsMiddleware = require('./middleware/cors');
const { authMiddleware, requireOwner } = require('./middleware/auth');

const sheetsService = require('./services/sheets.service');
const dashboardService = require('./services/dashboard.service');
const unitService = require('./services/unit.service');
const videoService = require('./services/video.service');
const pdfService = require('./services/pdf.service');

// Universal Request Dispatcher
async function handleRequest(req, res) {
  corsMiddleware(req, res, async () => {
    const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    // 1. Health check (§14) - Unauthenticated
    if (pathname === '/api/v1/health' && method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(success({ status: 'HEALTHY', timestamp: new Date().toISOString() })));
      return;
    }

    // Helper to read JSON body
    const readBody = () => new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(new Error('Malformed JSON body'));
        }
      });
      req.on('error', reject);
    });

    // All subsequent routes require Authentication & Allowlist verification (§9)
    await authMiddleware(req, res, async () => {
      try {
        // 2. Bootstrap endpoint (§14)
        if (pathname === '/api/v1/bootstrap' && method === 'GET') {
          const lists = await sheetsService.getLists();
          const dashboard = await dashboardService.getDashboardData();
          const units = await unitService.getUnits();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success({
            user: req.user,
            lists,
            dashboard,
            unitLookups: units.map(u => ({ unitId: u.unitId, clientName: u.clientName, location: u.location, unitType: u.unitType, area: u.area })),
            isConfigured: true
          })));
          return;
        }

        // 3. Dashboard
        if (pathname === '/api/v1/dashboard' && method === 'GET') {
          const dash = await dashboardService.getDashboardData(query);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(dash)));
          return;
        }

        // 4. Units routes
        if (pathname === '/api/v1/units' && method === 'GET') {
          const units = await unitService.getUnits();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(units)));
          return;
        }

        if (pathname === '/api/v1/units' && method === 'POST') {
          const body = await readBody();
          const unit = await unitService.createUnit(body, req.user);
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(unit, 'Unit created successfully')));
          return;
        }

        const unitDetailMatch = pathname.match(/^\/api\/v1\/units\/([a-zA-Z0-9_-]+)$/);
        if (unitDetailMatch) {
          const unitId = unitDetailMatch[1];
          if (method === 'GET') {
            const detail = await unitService.getUnitDetail(unitId);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(success(detail)));
            return;
          }
          if (method === 'PATCH') {
            const body = await readBody();
            const updated = await unitService.updateUnit(unitId, body.fields, body.executeBatchRename, req.user);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(success(updated, 'Unit updated successfully')));
            return;
          }
        }

        // 5. Videos routes
        if (pathname === '/api/v1/videos' && method === 'GET') {
          const result = await videoService.getLibraryVideos(query);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(result)));
          return;
        }

        if (pathname === '/api/v1/videos/project' && method === 'POST') {
          const body = await readBody();
          const resData = await videoService.addProjectVideo(body, req.user);
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(resData, 'Project video saved successfully')));
          return;
        }

        if (pathname === '/api/v1/videos/marketing' && method === 'POST') {
          const body = await readBody();
          const resData = await videoService.addMarketingContent(body, req.user);
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(resData, 'Marketing content saved successfully')));
          return;
        }

        if (pathname === '/api/v1/videos/version' && method === 'POST') {
          const body = await readBody();
          const newVer = await videoService.addNewVersion(body, req.user);
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(newVer, 'New video version saved successfully')));
          return;
        }

        const vHistMatch = pathname.match(/^\/api\/v1\/videos\/([a-zA-Z0-9_-]+)\/versions$/);
        if (vHistMatch && method === 'GET') {
          const vNum = vHistMatch[1];
          const hist = await videoService.getVideoVersionHistory(vNum);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(hist)));
          return;
        }

        const vMetaMatch = pathname.match(/^\/api\/v1\/videos\/([a-zA-Z0-9_-]+)\/metadata$/);
        if (vMetaMatch && method === 'PATCH') {
          const driveFileId = vMetaMatch[1];
          const body = await readBody();
          const updateRes = await videoService.updateSingleVideoMetadata(driveFileId, body.fields, body.confirmRename, req.user);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(updateRes, 'Metadata updated successfully')));
          return;
        }

        // 6. PDF upload route
        if (pathname === '/api/v1/pdfs' && method === 'POST') {
          const body = await readBody();
          const pdfRes = await pdfService.uploadPdf(body, req.user);
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(success(pdfRes, 'PDF uploaded successfully')));
          return;
        }

        // 7. Config (Owner-only §11)
        if (pathname === '/api/v1/config' && method === 'GET') {
          requireOwner(req, res, async () => {
            const users = await sheetsService.getAuthorisedUsers();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(success({
              spreadsheetId: config.SPREADSHEET_ID,
              rootFolderId: config.ROOT_FOLDER_ID,
              users: users
            })));
          });
          return;
        }

        // 404 Route
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(error('NOT_FOUND', 'Route not found: ' + pathname)));
      } catch (handlerErr) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(error('BAD_REQUEST', handlerErr.message)));
      }
    });
  });
}

// Server Factory
function createServer() {
  return http.createServer(handleRequest);
}

if (require.main === module) {
  const server = createServer();
  server.listen(config.PORT, () => {
    console.log(`Amlaak Video Library API listening on port ${config.PORT} (env: ${config.NODE_ENV})`);
  });
}

module.exports = { handleRequest, createServer };
