'use strict';
const { WebSocketServer } = require('ws');

let wss = null;

function createWsServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    console.log(`[ws] Client connected (${wss.clients.size} total)`);
    ws.send(JSON.stringify({ type: 'CONNECTED', data: { message: 'SpendGuard live feed connected' }, timestamp: new Date().toISOString() }));

    ws.on('close', () => {
      console.log(`[ws] Client disconnected (${wss.clients.size} remaining)`);
    });

    ws.on('error', (err) => {
      console.error('[ws] Error:', err.message);
    });
  });

  return wss;
}

function broadcast(type, data) {
  if (!wss) return;
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      try { client.send(msg); } catch (_) {}
    }
  });
}

function getWss() { return wss; }

module.exports = { createWsServer, broadcast, getWss };
