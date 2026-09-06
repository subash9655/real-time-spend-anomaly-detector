'use strict';
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./database/db');
const { createWsServer } = require('./api/websocket');
const { router, init } = require('./api/routes');
const { SimulationService } = require('./services/simulationService');
const { NotificationService } = require('./services/notificationService');
const { AuditService } = require('./services/auditService');
const { createSchema } = require('./database/schema');

const PORT = parseInt(process.env.PORT || '3001');
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

async function main() {
  // 1. Database (async init for sql.js WASM)
  const db = await initDb();
  createSchema(db);
  console.log('[startup] Database ready.');

  // 2. Seed if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM cloud_accounts').get();
  if (!count || count.c === 0) {
    console.log('[startup] Empty database — seeding…');
    const { seed } = require('./database/seed');
    const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER;
    if (isProd) {
      console.log('[startup] Production environment detected. Running lightweight seed to conserve memory.');
      seed(db, { lightweight: true });
    } else {
      console.log('[startup] Local development detected. Running full seed.');
      seed(db, { lightweight: false });
    }
    console.log('[startup] Seed complete.');
  }

  // 3. Services
  const simSvc   = new SimulationService(db);
  const notifSvc = new NotificationService(db);
  const auditSvc = new AuditService(db);

  // 4. Express
  const app = express();
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());

  // Health
  app.get('/health', (_req, res) => res.json({
    status: 'ok',
    ts: new Date().toISOString(),
    notice: '⚠️  SIMULATION / DEMO ENVIRONMENT — No real cloud credentials or patient data',
  }));

  // API routes
  init(db, simSvc, notifSvc, auditSvc);
  app.use('/api', router);

  // Error handler
  app.use((err, _req, res, _next) => {
    console.error('[error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  });

  // 5. HTTP + WebSocket
  const server = http.createServer(app);
  const wss    = createWsServer(server);
  simSvc.setWsServer(wss);

  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  SpendGuard Backend  ·  SIMULATION / DEMO ENVIRONMENT   ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  API   →  http://localhost:${PORT}/api                     ║`);
    console.log(`║  WS    →  ws://localhost:${PORT}                           ║`);
    console.log(`║  Health→  http://localhost:${PORT}/health                  ║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  });
}

main().catch(e => { console.error('[fatal]', e.stack || e); process.exit(1); });
