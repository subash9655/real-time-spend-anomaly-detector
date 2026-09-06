'use strict';
const { v4: uuid } = require('uuid');

class NotificationService {
  constructor(db) { this.db = db; }

  createNotification(anomalyId, owner, anomalyTimestamp) {
    const config = this.db.prepare('SELECT notification_delay_minutes FROM simulation_config WHERE id=1').get();
    const delayMs = (config?.notification_delay_minutes ?? 2) * 60000;
    const createdAt = anomalyTimestamp || new Date().toISOString();
    const notifTime = new Date(new Date(createdAt).getTime() + delayMs + Math.random() * 180000).toISOString();
    const latency   = (new Date(notifTime) - new Date(createdAt)) / 60000;

    const id = uuid();
    this.db.prepare(`
      INSERT INTO notifications (id,anomaly_id,owner,created_at,notification_time,status,acknowledged_at,latency_minutes)
      VALUES (@id,@anomaly_id,@owner,@created_at,@notification_time,@status,@acknowledged_at,@latency_minutes)
    `).run({ id, anomaly_id: anomalyId, owner, created_at: createdAt, notification_time: notifTime, status: 'sent', acknowledged_at: null, latency_minutes: Math.round(latency * 10) / 10 });

    // Audit
    this.db.prepare(`
      INSERT INTO audit_logs (id,timestamp,actor,action,entity_type,entity_id,previous_state,new_state,reason,related_anomaly_id,status)
      VALUES (@id,@timestamp,@actor,@action,@entity_type,@entity_id,@previous_state,@new_state,@reason,@related_anomaly_id,@status)
    `).run({ id: uuid(), timestamp: notifTime, actor: 'SpendGuard', action: 'NOTIFICATION_SENT', entity_type: 'notification', entity_id: id, previous_state: '{}', new_state: JSON.stringify({ owner, latency_minutes: latency }), reason: 'Owner notified of anomaly', related_anomaly_id: anomalyId, status: 'success' });

    return { id, anomalyId, owner, createdAt, notifTime, latencyMinutes: Math.round(latency * 10) / 10 };
  }

  getNotifications(filters = {}) {
    let sql = `SELECT n.*, a.severity, a.deviation_pct, r.name as resource_name, acc.name as account_name
               FROM notifications n
               JOIN anomalies a ON n.anomaly_id = a.id
               JOIN resources r ON a.resource_id = r.id
               JOIN cloud_accounts acc ON a.account_id = acc.id
               WHERE 1=1`;
    const params = [];
    if (filters.status) { sql += ' AND n.status = ?'; params.push(filters.status); }
    sql += ' ORDER BY n.created_at DESC';
    if (filters.limit) { sql += ` LIMIT ${parseInt(filters.limit)}`; }
    return this.db.prepare(sql).all(...params);
  }

  acknowledgeNotification(id) {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE notifications SET status=?, acknowledged_at=? WHERE id=?').run('acknowledged', now, id);
    return this.db.prepare('SELECT * FROM notifications WHERE id=?').get(id);
  }

  calculateAverageLatency() {
    const result = this.db.prepare('SELECT AVG(latency_minutes) as avg_latency, MIN(latency_minutes) as min_latency, MAX(latency_minutes) as max_latency, COUNT(*) as total FROM notifications').get();
    return {
      avgLatency: Math.round((result.avg_latency || 0) * 10) / 10,
      minLatency: Math.round((result.min_latency || 0) * 10) / 10,
      maxLatency: Math.round((result.max_latency || 0) * 10) / 10,
      total: result.total,
    };
  }
}

module.exports = { NotificationService };
