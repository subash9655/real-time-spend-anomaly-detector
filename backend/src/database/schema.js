'use strict';

/**
 * schema.js
 * Creates all SQLite tables for SpendGuard using better-sqlite3.
 * Called once at startup; uses CREATE TABLE IF NOT EXISTS so it is idempotent.
 */

function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- ---------------------------------------------------------------
    -- cloud_accounts
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS cloud_accounts (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      account_type        TEXT NOT NULL,          -- 'imaging' | 'backup' | 'analytics'
      owner               TEXT NOT NULL,
      environment         TEXT NOT NULL DEFAULT 'production',
      region              TEXT NOT NULL DEFAULT 'ap-south-1',
      monthly_budget      REAL NOT NULL DEFAULT 0,
      current_spend       REAL NOT NULL DEFAULT 0,
      status              TEXT NOT NULL DEFAULT 'active',
      created_at          TEXT NOT NULL
    );

    -- ---------------------------------------------------------------
    -- resources
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS resources (
      id                      TEXT PRIMARY KEY,
      account_id              TEXT NOT NULL REFERENCES cloud_accounts(id),
      name                    TEXT NOT NULL,
      resource_type           TEXT NOT NULL,      -- 's3'|'ec2'|'rds'|'cloudfront'|'vpc'|'glacier'|'emr'|'sagemaker'
      owner                   TEXT NOT NULL,
      region                  TEXT NOT NULL DEFAULT 'ap-south-1',
      current_cost_per_hour   REAL NOT NULL DEFAULT 0,
      expected_cost_per_hour  REAL NOT NULL DEFAULT 0,
      utilization_pct         REAL NOT NULL DEFAULT 0,
      status                  TEXT NOT NULL DEFAULT 'active',
      tags                    TEXT NOT NULL DEFAULT '{}'   -- JSON string
    );

    -- ---------------------------------------------------------------
    -- billing_records
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS billing_records (
      id              TEXT PRIMARY KEY,
      account_id      TEXT NOT NULL REFERENCES cloud_accounts(id),
      resource_id     TEXT NOT NULL REFERENCES resources(id),
      timestamp       TEXT NOT NULL,
      actual_spend    REAL NOT NULL,
      expected_spend  REAL NOT NULL,
      resource_type   TEXT NOT NULL
    );

    -- ---------------------------------------------------------------
    -- resource_changes
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS resource_changes (
      id              TEXT PRIMARY KEY,
      resource_id     TEXT NOT NULL REFERENCES resources(id),
      account_id      TEXT NOT NULL REFERENCES cloud_accounts(id),
      change_type     TEXT NOT NULL,   -- 'scale_up'|'scale_down'|'config_change'|'tag_update'
      previous_value  TEXT NOT NULL DEFAULT '{}',
      new_value       TEXT NOT NULL DEFAULT '{}',
      timestamp       TEXT NOT NULL,
      actor           TEXT NOT NULL,
      reason          TEXT NOT NULL DEFAULT ''
    );

    -- ---------------------------------------------------------------
    -- deployments
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS deployments (
      id              TEXT PRIMARY KEY,
      service_name    TEXT NOT NULL,
      account_id      TEXT NOT NULL REFERENCES cloud_accounts(id),
      resource_id     TEXT NOT NULL REFERENCES resources(id),
      owner           TEXT NOT NULL,
      start_time      TEXT NOT NULL,
      end_time        TEXT,
      change_type     TEXT NOT NULL,   -- 'feature'|'hotfix'|'config'|'rollback'|'scale'
      status          TEXT NOT NULL DEFAULT 'completed',
      description     TEXT NOT NULL DEFAULT ''
    );

    -- ---------------------------------------------------------------
    -- workload_metrics
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS workload_metrics (
      id            TEXT PRIMARY KEY,
      account_id    TEXT NOT NULL REFERENCES cloud_accounts(id),
      resource_id   TEXT NOT NULL REFERENCES resources(id),
      timestamp     TEXT NOT NULL,
      metric_type   TEXT NOT NULL,   -- 'requests'|'data_volume_gb'|'storage_used_gb'|'cpu_pct'|'memory_pct'|'backup_volume_gb'
      value         REAL NOT NULL,
      unit          TEXT NOT NULL DEFAULT ''
    );

    -- ---------------------------------------------------------------
    -- anomalies
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS anomalies (
      id              TEXT PRIMARY KEY,
      account_id      TEXT NOT NULL REFERENCES cloud_accounts(id),
      resource_id     TEXT NOT NULL REFERENCES resources(id),
      timestamp       TEXT NOT NULL,
      detected_at     TEXT NOT NULL,
      actual_spend    REAL NOT NULL,
      expected_spend  REAL NOT NULL,
      deviation_pct   REAL NOT NULL,
      z_score         REAL NOT NULL,
      severity        TEXT NOT NULL,   -- 'low'|'medium'|'high'|'critical'
      status          TEXT NOT NULL DEFAULT 'open',
      likely_cause    TEXT NOT NULL DEFAULT '',
      confidence      REAL NOT NULL DEFAULT 0,
      explanation     TEXT NOT NULL DEFAULT '',
      recommendation  TEXT NOT NULL DEFAULT ''
    );

    -- ---------------------------------------------------------------
    -- evidence
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS evidence (
      id            TEXT PRIMARY KEY,
      anomaly_id    TEXT NOT NULL REFERENCES anomalies(id),
      evidence_type TEXT NOT NULL,   -- 'deployment'|'metric_spike'|'resource_change'|'billing_pattern'
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      timestamp     TEXT NOT NULL,
      value         REAL,
      unit          TEXT NOT NULL DEFAULT ''
    );

    -- ---------------------------------------------------------------
    -- notifications
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS notifications (
      id                  TEXT PRIMARY KEY,
      anomaly_id          TEXT NOT NULL REFERENCES anomalies(id),
      owner               TEXT NOT NULL,
      created_at          TEXT NOT NULL,
      notification_time   TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'sent',
      acknowledged_at     TEXT,
      latency_minutes     REAL NOT NULL DEFAULT 0
    );

    -- ---------------------------------------------------------------
    -- audit_logs
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS audit_logs (
      id                  TEXT PRIMARY KEY,
      timestamp           TEXT NOT NULL,
      actor               TEXT NOT NULL,
      action              TEXT NOT NULL,
      entity_type         TEXT NOT NULL,
      entity_id           TEXT NOT NULL,
      previous_state      TEXT NOT NULL DEFAULT '{}',
      new_state           TEXT NOT NULL DEFAULT '{}',
      reason              TEXT NOT NULL DEFAULT '',
      related_anomaly_id  TEXT,
      status              TEXT NOT NULL DEFAULT 'success'
    );

    -- ---------------------------------------------------------------
    -- change_requests
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS change_requests (
      id              TEXT PRIMARY KEY,
      anomaly_id      TEXT REFERENCES anomalies(id),
      resource_id     TEXT NOT NULL REFERENCES resources(id),
      title           TEXT NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      requester       TEXT NOT NULL,
      reviewer        TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'approved'|'rejected'|'executed'
      risk_level      TEXT NOT NULL DEFAULT 'medium',
      created_at      TEXT NOT NULL,
      reviewed_at     TEXT,
      executed_at     TEXT,
      reason          TEXT NOT NULL DEFAULT ''
    );

    -- ---------------------------------------------------------------
    -- rollback_actions
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS rollback_actions (
      id                  TEXT PRIMARY KEY,
      change_request_id   TEXT REFERENCES change_requests(id),
      resource_id         TEXT NOT NULL REFERENCES resources(id),
      original_state      TEXT NOT NULL DEFAULT '{}',
      new_state           TEXT NOT NULL DEFAULT '{}',
      reason              TEXT NOT NULL DEFAULT '',
      risk_level          TEXT NOT NULL DEFAULT 'medium',
      approval_status     TEXT NOT NULL DEFAULT 'pending',
      executed_at         TEXT,
      rolled_back_at      TEXT
    );

    -- ---------------------------------------------------------------
    -- experiment_runs
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS experiment_runs (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT NOT NULL DEFAULT '',
      baseline_minutes  REAL NOT NULL DEFAULT 0,
      target_minutes    REAL NOT NULL DEFAULT 0,
      measured_minutes  REAL NOT NULL DEFAULT 0,
      improvement_pct   REAL NOT NULL DEFAULT 0,
      true_positives    INTEGER NOT NULL DEFAULT 0,
      true_negatives    INTEGER NOT NULL DEFAULT 0,
      false_positives   INTEGER NOT NULL DEFAULT 0,
      false_negatives   INTEGER NOT NULL DEFAULT 0,
      precision_score   REAL NOT NULL DEFAULT 0,
      recall_score      REAL NOT NULL DEFAULT 0,
      f1_score          REAL NOT NULL DEFAULT 0,
      ran_at            TEXT NOT NULL
    );

    -- ---------------------------------------------------------------
    -- user_feedback
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS user_feedback (
      id            TEXT PRIMARY KEY,
      anomaly_id    TEXT REFERENCES anomalies(id),
      question_1    INTEGER NOT NULL DEFAULT 3,  -- 1-5 score
      question_2    INTEGER NOT NULL DEFAULT 3,
      question_3    INTEGER NOT NULL DEFAULT 3,
      question_4    INTEGER NOT NULL DEFAULT 3,
      question_5    INTEGER NOT NULL DEFAULT 3,
      comments      TEXT NOT NULL DEFAULT '',
      submitted_at  TEXT NOT NULL
    );

    -- ---------------------------------------------------------------
    -- simulation_config
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS simulation_config (
      id                          INTEGER PRIMARY KEY DEFAULT 1,
      is_running                  INTEGER NOT NULL DEFAULT 0,   -- 0=false, 1=true
      refresh_interval_seconds    INTEGER NOT NULL DEFAULT 30,
      warning_threshold           REAL NOT NULL DEFAULT 15,
      anomaly_threshold           REAL NOT NULL DEFAULT 30,
      high_priority_threshold     REAL NOT NULL DEFAULT 75,
      notification_delay_minutes  REAL NOT NULL DEFAULT 2,
      created_at                  TEXT NOT NULL,
      updated_at                  TEXT NOT NULL
    );
  `);

  console.log('[schema] All tables created / verified.');
}

module.exports = { createSchema };
