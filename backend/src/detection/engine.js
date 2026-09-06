'use strict';
/**
 * engine.js — SpendGuard Anomaly Detection Engine
 *
 * Algorithm (fully transparent):
 *  1. Rolling 7-day baseline  →  mean & stdDev per resource
 *  2. Z-score = (actual - mean) / stdDev
 *  3. Deviation% = ((actual - expected) / expected) × 100
 *  4. Severity classification via configurable thresholds
 *  5. Root-cause by time-correlating deployments, resource changes, workload
 */

const { v4: uuid } = require('uuid');

class AnomalyDetectionEngine {
  constructor(db) {
    this.db = db;
  }

  // ── 1. Baseline ────────────────────────────────────────────────────────────
  calculateBaseline(resourceId, windowHours = 168) {
    const cutoff = new Date(Date.now() - windowHours * 3600000).toISOString();
    const rows = this.db.prepare(
      `SELECT actual_spend FROM billing_records
       WHERE resource_id = ? AND timestamp >= ?
       ORDER BY timestamp DESC LIMIT 500`
    ).all(resourceId, cutoff);

    if (rows.length < 3) return null;
    const values = rows.map(r => r.actual_spend);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev, sampleSize: values.length };
  }

  // ── 2. Z-score ─────────────────────────────────────────────────────────────
  calculateZScore(actual, mean, stdDev) {
    if (stdDev === 0) return 0;
    return (actual - mean) / stdDev;
  }

  // ── 3. Severity ────────────────────────────────────────────────────────────
  classifySeverity(deviationPct, zScore, config) {
    const hp = config?.high_priority_threshold ?? 75;
    const an = config?.anomaly_threshold ?? 30;
    const wa = config?.warning_threshold ?? 15;

    if (Math.abs(deviationPct) >= hp || Math.abs(zScore) >= 3.5) return 'HIGH_PRIORITY';
    if (Math.abs(deviationPct) >= an || Math.abs(zScore) >= 2.5) return 'ANOMALY';
    if (Math.abs(deviationPct) >= wa || Math.abs(zScore) >= 1.5) return 'WARNING';
    return 'NORMAL';
  }

  // ── 4. Root Cause ──────────────────────────────────────────────────────────
  findRootCause(resourceId, accountId, timestamp) {
    const ts = new Date(timestamp).getTime();
    const twoHoursBefore = new Date(ts - 7200000).toISOString();
    const oneHourBefore  = new Date(ts - 3600000).toISOString();

    // 4a. Correlated deployment (within 2h before)
    const deployment = this.db.prepare(
      `SELECT * FROM deployments
       WHERE account_id = ? AND start_time >= ? AND start_time <= ?
       ORDER BY start_time DESC LIMIT 1`
    ).get(accountId, twoHoursBefore, timestamp);

    // 4b. Correlated resource change (within 1h before)
    const resourceChange = this.db.prepare(
      `SELECT * FROM resource_changes
       WHERE resource_id = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC LIMIT 1`
    ).get(resourceId, oneHourBefore, timestamp);

    // 4c. Workload spike in same hour
    const workloadSpike = this.db.prepare(
      `SELECT metric_type, value, unit FROM workload_metrics
       WHERE resource_id = ? AND timestamp >= ? AND timestamp <= ?
       AND metric_type IN ('cpu_pct','storage_used_gb','backup_volume_gb','data_volume_gb')
       ORDER BY value DESC LIMIT 1`
    ).get(resourceId, oneHourBefore, timestamp);

    // Confidence scoring
    let confidence = 40; // base
    let likelyCause = 'Unexplained spending increase — no correlated event found';

    if (deployment) {
      confidence += 35;
      likelyCause = `Recent deployment "${deployment.service_name}" likely caused the cost increase`;
    }
    if (resourceChange) {
      confidence += 25;
      if (deployment) {
        likelyCause = `Deployment "${deployment.service_name}" triggered a ${resourceChange.change_type.replace('_', ' ')} resource change`;
      } else {
        likelyCause = `Resource configuration change (${resourceChange.change_type.replace('_', ' ')}) caused the cost increase`;
      }
    }
    if (workloadSpike) {
      confidence += 15;
      if (!deployment && !resourceChange) {
        likelyCause = `Workload metric spike (${workloadSpike.metric_type}: ${workloadSpike.value} ${workloadSpike.unit}) likely driving the cost`;
      }
    }

    confidence = Math.min(confidence, 97);

    return { likelyCause, confidence, deployment, resourceChange, workloadSpike };
  }

  // ── 5. Explanation ─────────────────────────────────────────────────────────
  generateExplanation(resourceName, actualSpend, expectedSpend, deviationPct, rootCause) {
    const diff = Math.round(actualSpend - expectedSpend);
    const pct  = Math.round(deviationPct);

    let what   = `The hourly cloud bill for "${resourceName}" is ₹${actualSpend.toLocaleString('en-IN')} — ₹${diff.toLocaleString('en-IN')} (${pct}%) above the expected ₹${expectedSpend.toLocaleString('en-IN')}.`;
    let why    = rootCause.likelyCause + '.';
    let impact = pct >= 75 ? 'This is a HIGH priority issue — immediate review is needed.'
               : pct >= 30 ? 'This exceeds normal variance and warrants investigation.'
               :              'This is a minor overage — monitor for recurrence.';

    if (rootCause.deployment) {
      why = `The deployment "${rootCause.deployment.service_name}" executed recently appears to be the primary driver. ${rootCause.deployment.description}`;
    } else if (rootCause.resourceChange) {
      why = `A resource configuration change (${rootCause.resourceChange.change_type.replace(/_/g,' ')}) was recorded just before the spike.`;
    } else if (rootCause.workloadSpike) {
      why = `An unusually high workload metric (${rootCause.workloadSpike.metric_type}: ${rootCause.workloadSpike.value} ${rootCause.workloadSpike.unit}) correlates with the cost increase.`;
    }

    return `${what} ${why} ${impact}`;
  }

  // ── 6. Recommendation ─────────────────────────────────────────────────────
  generateRecommendation(severity, rootCause) {
    if (rootCause.deployment) {
      return `Review the "${rootCause.deployment.service_name}" deployment and verify whether the associated cost increase was expected and budgeted. If the change was intentional, approve it in Change Review and update the budget forecast. If unintentional, prepare a rollback.`;
    }
    if (rootCause.resourceChange) {
      return `Investigate the resource configuration change (${rootCause.resourceChange.change_type.replace(/_/g,' ')}) and confirm it was authorized. If the change exceeds budget, submit a Change Review request.`;
    }
    if (severity === 'HIGH_PRIORITY') {
      return `Immediately investigate the resource for unauthorized access, misconfigured jobs, or unexpected workload growth. Escalate to the resource owner and consider pausing the resource if access cannot be confirmed.`;
    }
    return `Monitor this resource over the next 2 hours. If the overage persists, investigate workload changes and review recent configuration updates. No immediate action required at this severity level.`;
  }

  // ── 7. Evidence ────────────────────────────────────────────────────────────
  generateEvidence(anomalyId, resourceName, actualSpend, expectedSpend, deviationPct, timestamp, rootCause) {
    const items = [];
    const base = { anomaly_id: anomalyId };

    items.push({ ...base, id: uuid(), evidence_type: 'billing_pattern', title: 'Spend spike detected', description: `Actual hourly spend (₹${Math.round(actualSpend).toLocaleString('en-IN')}) is ${Math.round(deviationPct)}% above expected (₹${Math.round(expectedSpend).toLocaleString('en-IN')}).`, timestamp, value: deviationPct, unit: '%' });

    if (rootCause.deployment) {
      items.push({ ...base, id: uuid(), evidence_type: 'deployment', title: `Correlated deployment: ${rootCause.deployment.service_name}`, description: rootCause.deployment.description, timestamp: rootCause.deployment.start_time, value: null, unit: '' });
    }
    if (rootCause.resourceChange) {
      items.push({ ...base, id: uuid(), evidence_type: 'resource_change', title: `Resource change: ${rootCause.resourceChange.change_type.replace(/_/g,' ')}`, description: `Configuration changed from ${rootCause.resourceChange.previous_value} to ${rootCause.resourceChange.new_value}`, timestamp: rootCause.resourceChange.timestamp, value: null, unit: '' });
    }
    if (rootCause.workloadSpike) {
      items.push({ ...base, id: uuid(), evidence_type: 'metric_spike', title: `Workload spike: ${rootCause.workloadSpike.metric_type}`, description: `${rootCause.workloadSpike.metric_type} reached ${rootCause.workloadSpike.value} ${rootCause.workloadSpike.unit}`, timestamp, value: rootCause.workloadSpike.value, unit: rootCause.workloadSpike.unit });
    }

    const insertEvidence = this.db.prepare(`
      INSERT OR IGNORE INTO evidence (id,anomaly_id,evidence_type,title,description,timestamp,value,unit)
      VALUES (@id,@anomaly_id,@evidence_type,@title,@description,@timestamp,@value,@unit)
    `);
    for (const e of items) insertEvidence.run(e);
    return items;
  }

  // ── 8. Process billing tick ─────────────────────────────────────────────────
  processBillingTick(accountId, resourceId, actualSpend, timestamp) {
    const config = this.db.prepare('SELECT * FROM simulation_config WHERE id = 1').get();
    const baseline = this.calculateBaseline(resourceId);
    if (!baseline) return null; // not enough history

    const expectedSpend = baseline.mean;
    const deviationPct  = ((actualSpend - expectedSpend) / expectedSpend) * 100;
    const zScore        = this.calculateZScore(actualSpend, baseline.mean, baseline.stdDev);
    const severity      = this.classifySeverity(deviationPct, zScore, config);

    if (severity === 'NORMAL') return null;

    // Get resource/account info
    const resource = this.db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId);
    const account  = this.db.prepare('SELECT * FROM cloud_accounts WHERE id = ?').get(accountId);
    if (!resource || !account) return null;

    const rootCause   = this.findRootCause(resourceId, accountId, timestamp);
    const explanation = this.generateExplanation(resource.name, actualSpend, expectedSpend, deviationPct, rootCause);
    const recommendation = this.generateRecommendation(severity, rootCause);

    const anomalyId  = uuid();
    const detectedAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO anomalies (id,account_id,resource_id,timestamp,detected_at,actual_spend,expected_spend,deviation_pct,z_score,severity,status,likely_cause,confidence,explanation,recommendation)
      VALUES (@id,@account_id,@resource_id,@timestamp,@detected_at,@actual_spend,@expected_spend,@deviation_pct,@z_score,@severity,@status,@likely_cause,@confidence,@explanation,@recommendation)
    `).run({
      id: anomalyId, account_id: accountId, resource_id: resourceId,
      timestamp, detected_at: detectedAt,
      actual_spend: Math.round(actualSpend), expected_spend: Math.round(expectedSpend),
      deviation_pct: Math.round(deviationPct * 10) / 10,
      z_score: Math.round(zScore * 100) / 100,
      severity, status: 'active',
      likely_cause: rootCause.likelyCause,
      confidence: rootCause.confidence,
      explanation, recommendation,
    });

    if (severity === 'HIGH_PRIORITY' || severity === 'ANOMALY') {
      this.generateEvidence(anomalyId, resource.name, actualSpend, expectedSpend, deviationPct, timestamp, rootCause);
    }

    // Audit
    this.db.prepare(`
      INSERT INTO audit_logs (id,timestamp,actor,action,entity_type,entity_id,previous_state,new_state,reason,related_anomaly_id,status)
      VALUES (@id,@timestamp,@actor,@action,@entity_type,@entity_id,@previous_state,@new_state,@reason,@related_anomaly_id,@status)
    `).run({
      id: uuid(), timestamp: detectedAt, actor: 'SpendGuard', action: 'ANOMALY_DETECTED',
      entity_type: 'anomaly', entity_id: anomalyId, previous_state: '{}',
      new_state: JSON.stringify({ severity, deviation_pct: deviationPct }),
      reason: `Z-score ${zScore.toFixed(2)}, deviation ${deviationPct.toFixed(1)}%`,
      related_anomaly_id: anomalyId, status: 'success',
    });

    return {
      id: anomalyId, accountId, resourceId, timestamp, detectedAt,
      actualSpend: Math.round(actualSpend), expectedSpend: Math.round(expectedSpend),
      deviationPct, zScore, severity, likelyCause: rootCause.likelyCause,
      confidence: rootCause.confidence, explanation, recommendation,
      accountName: account.name, resourceName: resource.name, owner: account.owner,
    };
  }

  // ── 9. Simulate anomaly injection ──────────────────────────────────────────
  simulateAnomaly(accountId, resourceId, magnitude = 2.5) {
    const resource  = this.db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId);
    if (!resource) return null;
    const baseline = this.calculateBaseline(resourceId) || { mean: resource.expected_cost_per_hour };
    const actualSpend = baseline.mean * (1 + magnitude);
    const timestamp = new Date().toISOString();

    // Insert the underlying billing tick into DB for data consistency
    this.db.prepare(`
      INSERT INTO billing_records (id,account_id,resource_id,timestamp,actual_spend,expected_spend,resource_type)
      VALUES (?,?,?,?,?,?,?)
    `).run(uuid(), accountId, resourceId, timestamp, Math.round(actualSpend), Math.round(baseline.mean), resource.resource_type);

    return this.processBillingTick(accountId, resourceId, actualSpend, timestamp);
  }
}

module.exports = { AnomalyDetectionEngine };
