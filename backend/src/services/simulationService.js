'use strict';
const { v4: uuid } = require('uuid');
const { AnomalyDetectionEngine } = require('../detection/engine');
const { NotificationService } = require('./notificationService');
const { AuditService } = require('./auditService');

let _tickInterval = null;
let _wsServer = null;

class SimulationService {
  constructor(db) {
    this.db = db;
    this.engine = new AnomalyDetectionEngine(db);
    this.notifService = new NotificationService(db);
    this.auditService = new AuditService(db);
  }

  setWsServer(ws) { _wsServer = ws; }

  broadcast(type, data) {
    if (!_wsServer) return;
    const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    _wsServer.clients.forEach(client => {
      if (client.readyState === 1) client.send(msg);
    });
  }

  getConfig() {
    return this.db.prepare('SELECT * FROM simulation_config WHERE id=1').get();
  }

  updateConfig(updates) {
    const allowed = ['refresh_interval_seconds','warning_threshold','anomaly_threshold','high_priority_threshold','notification_delay_minutes'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
    }
    if (sets.length) {
      sets.push('updated_at = ?'); vals.push(new Date().toISOString());
      this.db.prepare(`UPDATE simulation_config SET ${sets.join(', ')} WHERE id=1`).run(...vals);
    }
    return this.getConfig();
  }

  getStatus() {
    const cfg   = this.getConfig();
    const stats = this.db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM anomalies`).get();
    return { is_running: !!cfg?.is_running, config: cfg, anomalyStats: stats };
  }

  startMonitoring() {
    this.db.prepare('UPDATE simulation_config SET is_running=1, updated_at=? WHERE id=1').run(new Date().toISOString());
    this.auditService.logEvent({ actor: 'SpendGuard', action: 'MONITORING_STARTED', entityType: 'system', entityId: 'simulation', newState: { is_running: true }, reason: 'User started monitoring' });
    this.broadcast('SIMULATION_STATUS', { is_running: true, message: 'Live monitoring started' });
    this._scheduleTick();
    return this.getStatus();
  }

  pauseMonitoring() {
    this.db.prepare('UPDATE simulation_config SET is_running=0, updated_at=? WHERE id=1').run(new Date().toISOString());
    if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
    this.auditService.logEvent({ actor: 'SpendGuard', action: 'MONITORING_PAUSED', entityType: 'system', entityId: 'simulation', reason: 'User paused monitoring' });
    this.broadcast('SIMULATION_STATUS', { is_running: false, message: 'Monitoring paused' });
    return this.getStatus();
  }

  resetSimulation() {
    if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
    // Remove only simulation-generated records (not seeded ones)
    this.db.prepare("DELETE FROM anomalies WHERE id NOT IN ('ano-001','ano-002','ano-003','ano-004','ano-005','ano-006')").run();
    this.db.prepare('UPDATE simulation_config SET is_running=0, updated_at=? WHERE id=1').run(new Date().toISOString());
    this.broadcast('SIMULATION_STATUS', { is_running: false, message: 'Simulation reset' });
    return { message: 'Simulation reset successfully' };
  }

  processNextTick() {
    const cfg = this.getConfig();
    if (!cfg?.is_running) return null;

    const resources = this.db.prepare('SELECT r.*, acc.owner FROM resources r JOIN cloud_accounts acc ON r.account_id = acc.id').all();
    const now = new Date().toISOString();
    const results = [];

    for (const res of resources) {
      const noise = 1 + (Math.random() - 0.5) * 0.10;
      const actual = res.expected_cost_per_hour * noise;

      // Insert billing tick
      this.db.prepare(`
        INSERT INTO billing_records (id,account_id,resource_id,timestamp,actual_spend,expected_spend,resource_type)
        VALUES (?,?,?,?,?,?,?)
      `).run(uuid(), res.account_id, res.id, now, Math.round(actual), Math.round(res.expected_cost_per_hour), res.resource_type);

      const anomaly = this.engine.processBillingTick(res.account_id, res.id, actual, now);
      if (anomaly) {
        results.push(anomaly);
        const notif = this.notifService.createNotification(anomaly.id, res.owner, now);
        this.broadcast('ANOMALY_DETECTED', { anomaly, notification: notif });
        this.broadcast('NOTIFICATION_SENT', notif);
      }
    }

    this.broadcast('BILLING_TICK', { timestamp: now, resourceCount: resources.length });
    return results;
  }

  triggerAnomaly({ accountId, resourceId, magnitude = 2.0, label } = {}) {
    // Default to a random high-cost resource if not specified
    if (!resourceId) {
      const res = this.db.prepare(`SELECT * FROM resources ORDER BY RANDOM() LIMIT 1`).get();
      resourceId = res.id;
      accountId  = res.account_id;
    }
    if (!accountId) {
      const res = this.db.prepare('SELECT account_id FROM resources WHERE id=?').get(resourceId);
      accountId = res?.account_id;
    }

    const resource = this.db.prepare('SELECT * FROM resources WHERE id=?').get(resourceId);
    const account  = this.db.prepare('SELECT * FROM cloud_accounts WHERE id=?').get(accountId);
    if (!resource || !account) return { error: 'Resource or account not found' };

    const anomaly = this.engine.simulateAnomaly(accountId, resourceId, magnitude);
    if (!anomaly) return { error: 'Could not generate anomaly — insufficient baseline data' };

    const notif = this.notifService.createNotification(anomaly.id, account.owner, anomaly.timestamp);
    this.broadcast('ANOMALY_DETECTED', { anomaly, notification: notif });
    this.broadcast('NOTIFICATION_SENT', notif);

    return { anomaly, notification: notif };
  }

  _scheduleTick() {
    if (_tickInterval) clearInterval(_tickInterval);
    const cfg = this.getConfig();
    const interval = (cfg?.refresh_interval_seconds || 30) * 1000;
    _tickInterval = setInterval(() => {
      const cfg2 = this.getConfig();
      if (cfg2?.is_running) this.processNextTick();
      else { clearInterval(_tickInterval); _tickInterval = null; }
    }, interval);
  }
}

module.exports = { SimulationService };
