'use strict';
const { v4: uuid } = require('uuid');

class AuditService {
  constructor(db) { this.db = db; }

  logEvent({ actor, action, entityType, entityId, previousState = {}, newState = {}, reason = '', relatedAnomalyId = null }) {
    const id = uuid();
    const timestamp = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO audit_logs (id,timestamp,actor,action,entity_type,entity_id,previous_state,new_state,reason,related_anomaly_id,status)
      VALUES (@id,@timestamp,@actor,@action,@entity_type,@entity_id,@previous_state,@new_state,@reason,@related_anomaly_id,@status)
    `).run({
      id, timestamp, actor, action,
      entity_type: entityType, entity_id: entityId || '',
      previous_state: JSON.stringify(previousState),
      new_state: JSON.stringify(newState),
      reason, related_anomaly_id: relatedAnomalyId, status: 'success',
    });
    return { id, timestamp };
  }

  getAuditLog({ from, to, actor, action, entityType, relatedAnomalyId, limit = 200 } = {}) {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    if (from)             { sql += ' AND timestamp >= ?'; params.push(from); }
    if (to)               { sql += ' AND timestamp <= ?'; params.push(to); }
    if (actor)            { sql += ' AND actor LIKE ?'; params.push(`%${actor}%`); }
    if (action)           { sql += ' AND action LIKE ?'; params.push(`%${action}%`); }
    if (entityType)       { sql += ' AND entity_type = ?'; params.push(entityType); }
    if (relatedAnomalyId) { sql += ' AND related_anomaly_id = ?'; params.push(relatedAnomalyId); }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    return this.db.prepare(sql).all(...params);
  }
}

module.exports = { AuditService };
