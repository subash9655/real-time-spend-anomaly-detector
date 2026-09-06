'use strict';
/**
 * seed.js  –  SpendGuard synthetic data generator
 * Run:  node src/database/seed.js
 *
 * Generates 30 days of realistic hospital cloud billing data with
 * 3 anomalous periods, deployments, workload metrics, anomaly records,
 * evidence, notifications, audit logs, change requests, experiment data,
 * and user feedback.
 *
 * All amounts in INR (₹). Uses deterministic pseudo-random for reproducibility.
 */

const { v4: uuid } = require('uuid');

// ── Deterministic seeded pseudo-random (mulberry32) ──────────────────────────
function makePrng(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makePrng(20240901);
const rand = (min, max) => min + rng() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];

// ── Reference data ────────────────────────────────────────────────────────────
const NOW = new Date('2026-09-05T12:00:00Z');
const DAY_MS = 86400000;
const HOUR_MS = 3600000;

const accounts = [
  {
    id: 'acc-imaging-001',
    name: 'Hospital Imaging Account',
    account_type: 'imaging',
    owner: 'Dr. Priya Sharma',
    environment: 'production',
    region: 'ap-south-1',
    monthly_budget: 850000,
    status: 'active',
  },
  {
    id: 'acc-backup-002',
    name: 'Hospital Backup Account',
    account_type: 'backup',
    owner: 'Rajesh Kumar',
    environment: 'production',
    region: 'ap-south-1',
    monthly_budget: 450000,
    status: 'active',
  },
  {
    id: 'acc-analytics-003',
    name: 'Hospital Analytics Account',
    account_type: 'analytics',
    owner: 'Anita Patel',
    environment: 'production',
    region: 'ap-south-1',
    monthly_budget: 620000,
    status: 'active',
  },
];

const resources = [
  // ── Imaging (acc-imaging-001) ──
  { id: 'res-img-s3-001', account_id: 'acc-imaging-001', name: 'DICOM Image Storage', resource_type: 's3', owner: 'Dr. Priya Sharma', region: 'ap-south-1', base_cost: 3200, expected_cost: 3200, utilization: 72 },
  { id: 'res-img-ec2-002', account_id: 'acc-imaging-001', name: 'Imaging Compute Cluster', resource_type: 'ec2', owner: 'Dr. Priya Sharma', region: 'ap-south-1', base_cost: 4800, expected_cost: 4800, utilization: 65 },
  { id: 'res-img-rds-003', account_id: 'acc-imaging-001', name: 'Imaging Database', resource_type: 'rds', owner: 'Dr. Priya Sharma', region: 'ap-south-1', base_cost: 2100, expected_cost: 2100, utilization: 58 },
  { id: 'res-img-cdn-004', account_id: 'acc-imaging-001', name: 'Imaging CDN', resource_type: 'cloudfront', owner: 'Dr. Priya Sharma', region: 'ap-south-1', base_cost: 980, expected_cost: 980, utilization: 44 },
  { id: 'res-img-vpc-005', account_id: 'acc-imaging-001', name: 'Modality Gateway', resource_type: 'vpc', owner: 'Dr. Priya Sharma', region: 'ap-south-1', base_cost: 620, expected_cost: 620, utilization: 38 },
  // ── Backup (acc-backup-002) ──
  { id: 'res-bak-s3-006', account_id: 'acc-backup-002', name: 'Backup Object Storage', resource_type: 's3', owner: 'Rajesh Kumar', region: 'ap-south-1', base_cost: 2800, expected_cost: 2800, utilization: 81 },
  { id: 'res-bak-rds-007', account_id: 'acc-backup-002', name: 'Backup Database', resource_type: 'rds', owner: 'Rajesh Kumar', region: 'ap-south-1', base_cost: 1400, expected_cost: 1400, utilization: 52 },
  { id: 'res-bak-ec2-008', account_id: 'acc-backup-002', name: 'Backup Compute', resource_type: 'ec2', owner: 'Rajesh Kumar', region: 'ap-south-1', base_cost: 1900, expected_cost: 1900, utilization: 60 },
  { id: 'res-bak-net-009', account_id: 'acc-backup-002', name: 'Backup Network Transfer', resource_type: 'vpc', owner: 'Rajesh Kumar', region: 'ap-south-1', base_cost: 580, expected_cost: 580, utilization: 35 },
  { id: 'res-bak-gla-010', account_id: 'acc-backup-002', name: 'Backup Vault', resource_type: 'glacier', owner: 'Rajesh Kumar', region: 'ap-south-1', base_cost: 420, expected_cost: 420, utilization: 67 },
  // ── Analytics (acc-analytics-003) ──
  { id: 'res-anl-s3-011', account_id: 'acc-analytics-003', name: 'Analytics Data Lake', resource_type: 's3', owner: 'Anita Patel', region: 'ap-south-1', base_cost: 3600, expected_cost: 3600, utilization: 74 },
  { id: 'res-anl-ec2-012', account_id: 'acc-analytics-003', name: 'Analytics Compute', resource_type: 'ec2', owner: 'Anita Patel', region: 'ap-south-1', base_cost: 4200, expected_cost: 4200, utilization: 68 },
  { id: 'res-anl-emr-013', account_id: 'acc-analytics-003', name: 'ML Processing Cluster', resource_type: 'emr', owner: 'Anita Patel', region: 'ap-south-1', base_cost: 5800, expected_cost: 5800, utilization: 55 },
  { id: 'res-anl-rds-014', account_id: 'acc-analytics-003', name: 'Analytics Database', resource_type: 'rds', owner: 'Anita Patel', region: 'ap-south-1', base_cost: 2400, expected_cost: 2400, utilization: 62 },
  { id: 'res-anl-rep-015', account_id: 'acc-analytics-003', name: 'Reporting Service', resource_type: 'ec2', owner: 'Anita Patel', region: 'ap-south-1', base_cost: 1800, expected_cost: 1800, utilization: 48 },
];

// Anomaly windows (day offset from start, hour range, resource index, magnitude %)
const anomalyWindows = [
  { dayOffset: 7, hourStart: 14, hourEnd: 18, resourceIds: ['res-bak-s3-006', 'res-bak-gla-010'], magnitude: 1.22 },
  { dayOffset: 14, hourStart: 9, hourEnd: 13, resourceIds: ['res-img-ec2-002', 'res-img-s3-001'], magnitude: 0.85 },
  { dayOffset: 22, hourStart: 20, hourEnd: 24, resourceIds: ['res-anl-emr-013', 'res-anl-ec2-012'], magnitude: 0.65 },
];

function isAnomaly(dayOffset, hour, resourceId) {
  for (const w of anomalyWindows) {
    if (dayOffset === w.dayOffset && hour >= w.hourStart && hour < w.hourEnd && w.resourceIds.includes(resourceId)) {
      return w.magnitude;
    }
  }
  return null;
}

function seed(db) {
  const existingAccounts = db.prepare('SELECT COUNT(*) as c FROM cloud_accounts').get();
  if (existingAccounts && existingAccounts.c > 0) {
    console.log('[seed] Database already seeded. Skipping.');
    return;
  }

  console.log('[seed] Starting data generation…');
  const startDate = new Date(NOW.getTime() - 30 * DAY_MS);

  // ── 1. Accounts ──────────────────────────────────────────────────────────────
  const insertAccount = db.prepare(`
    INSERT INTO cloud_accounts (id,name,account_type,owner,environment,region,monthly_budget,current_spend,status,created_at)
    VALUES (@id,@name,@account_type,@owner,@environment,@region,@monthly_budget,@current_spend,@status,@created_at)
  `);
  for (const a of accounts) {
    insertAccount.run({ ...a, current_spend: 0, created_at: new Date(startDate.getTime() - 90 * DAY_MS).toISOString() });
  }
  console.log('[seed] Accounts done.');

  // ── 2. Resources ─────────────────────────────────────────────────────────────
  const insertResource = db.prepare(`
    INSERT INTO resources (id,account_id,name,resource_type,owner,region,current_cost_per_hour,expected_cost_per_hour,utilization_pct,status,tags)
    VALUES (@id,@account_id,@name,@resource_type,@owner,@region,@current_cost_per_hour,@expected_cost_per_hour,@utilization_pct,@status,@tags)
  `);
  for (const r of resources) {
    insertResource.run({
      id: r.id, account_id: r.account_id, name: r.name, resource_type: r.resource_type,
      owner: r.owner, region: r.region, current_cost_per_hour: r.base_cost,
      expected_cost_per_hour: r.expected_cost, utilization_pct: r.utilization,
      status: 'active', tags: JSON.stringify({ env: 'production', project: 'hospital-infra' }),
    });
  }
  console.log('[seed] Resources done.');

  // ── 3. Billing records (30 days × 24 h × 15 resources) ───────────────────────
  const insertBillingSql = `INSERT INTO billing_records (id,account_id,resource_id,timestamp,actual_spend,expected_spend,resource_type) VALUES (@id,@account_id,@resource_id,@timestamp,@actual_spend,@expected_spend,@resource_type)`;

  let billingCount = 0;
  for (let day = 0; day < 30; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const ts = new Date(startDate.getTime() + day * DAY_MS + hour * HOUR_MS);
      for (const res of resources) {
        const noise = 1 + (rng() - 0.5) * 0.12;
        const expected = res.base_cost * noise;
        const anomalyMag = isAnomaly(day, hour, res.id);
        const actual = anomalyMag ? expected * (1 + anomalyMag) : expected * (1 + (rng() - 0.5) * 0.08);
        db.prepare(insertBillingSql).run({ id: uuid(), account_id: res.account_id, resource_id: res.id, timestamp: ts.toISOString(), actual_spend: Math.round(actual), expected_spend: Math.round(expected), resource_type: res.resource_type });
        billingCount++;
      }
    }
  }
  console.log(`[seed] Billing records done (${billingCount} rows).`);

  // ── 4. Deployments ───────────────────────────────────────────────────────────
  const deploymentsData = [
    { id: 'dep-001', service_name: 'Backup Policy Update', account_id: 'acc-backup-002', resource_id: 'res-bak-s3-006', owner: 'Rajesh Kumar', start_time: new Date(startDate.getTime() + 6 * DAY_MS + 13 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 6 * DAY_MS + 13.5 * HOUR_MS).toISOString(), change_type: 'config', status: 'completed', description: 'Increased backup retention from 30 to 90 days. Storage allocation tripled.' },
    { id: 'dep-002', service_name: 'DICOM Compression Rollout', account_id: 'acc-imaging-001', resource_id: 'res-img-ec2-002', owner: 'Dr. Priya Sharma', start_time: new Date(startDate.getTime() + 13 * DAY_MS + 8 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 13 * DAY_MS + 8.5 * HOUR_MS).toISOString(), change_type: 'feature', status: 'completed', description: 'Deployed new lossless DICOM compression service. Increased CPU demand.' },
    { id: 'dep-003', service_name: 'ML Model Retraining Job', account_id: 'acc-analytics-003', resource_id: 'res-anl-emr-013', owner: 'Anita Patel', start_time: new Date(startDate.getTime() + 21 * DAY_MS + 19 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 21 * DAY_MS + 20 * HOUR_MS).toISOString(), change_type: 'scale', status: 'completed', description: 'Quarterly ML model retraining with full dataset. EMR cluster scaled up.' },
    { id: 'dep-004', service_name: 'CDN Cache Flush', account_id: 'acc-imaging-001', resource_id: 'res-img-cdn-004', owner: 'Dr. Priya Sharma', start_time: new Date(startDate.getTime() + 3 * DAY_MS + 10 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 3 * DAY_MS + 10.25 * HOUR_MS).toISOString(), change_type: 'config', status: 'completed', description: 'Emergency CDN cache flush after routing misconfiguration.' },
    { id: 'dep-005', service_name: 'Backup Vault Migration', account_id: 'acc-backup-002', resource_id: 'res-bak-gla-010', owner: 'Rajesh Kumar', start_time: new Date(startDate.getTime() + 6 * DAY_MS + 12 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 6 * DAY_MS + 13 * HOUR_MS).toISOString(), change_type: 'feature', status: 'completed', description: 'Migrated legacy backups to Glacier Instant Retrieval tier.' },
    { id: 'dep-006', service_name: 'Analytics Pipeline v2.3', account_id: 'acc-analytics-003', resource_id: 'res-anl-ec2-012', owner: 'Anita Patel', start_time: new Date(startDate.getTime() + 10 * DAY_MS + 15 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 10 * DAY_MS + 16 * HOUR_MS).toISOString(), change_type: 'feature', status: 'completed', description: 'Deployed real-time analytics pipeline v2.3 with Kafka integration.' },
    { id: 'dep-007', service_name: 'Database Index Rebuild', account_id: 'acc-imaging-001', resource_id: 'res-img-rds-003', owner: 'Dr. Priya Sharma', start_time: new Date(startDate.getTime() + 17 * DAY_MS + 2 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 17 * DAY_MS + 4 * HOUR_MS).toISOString(), change_type: 'hotfix', status: 'completed', description: 'Emergency database index rebuild to resolve query degradation.' },
    { id: 'dep-008', service_name: 'Network Gateway Patch', account_id: 'acc-backup-002', resource_id: 'res-bak-net-009', owner: 'Rajesh Kumar', start_time: new Date(startDate.getTime() + 20 * DAY_MS + 6 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 20 * DAY_MS + 7 * HOUR_MS).toISOString(), change_type: 'hotfix', status: 'completed', description: 'Security patch applied to network gateway. Brief transfer slowdown.' },
    { id: 'dep-009', service_name: 'Reporting Dashboard v1.8', account_id: 'acc-analytics-003', resource_id: 'res-anl-rep-015', owner: 'Anita Patel', start_time: new Date(startDate.getTime() + 25 * DAY_MS + 11 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 25 * DAY_MS + 11.5 * HOUR_MS).toISOString(), change_type: 'feature', status: 'completed', description: 'New executive reporting dashboard with real-time cost drill-down.' },
    { id: 'dep-010', service_name: 'Backup Scheduler Upgrade', account_id: 'acc-backup-002', resource_id: 'res-bak-ec2-008', owner: 'Rajesh Kumar', start_time: new Date(startDate.getTime() + 28 * DAY_MS + 9 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 28 * DAY_MS + 10 * HOUR_MS).toISOString(), change_type: 'feature', status: 'running', description: 'Upgrading backup scheduler to support parallel job execution.' },
    { id: 'dep-011', service_name: 'Modality Gateway Hotfix', account_id: 'acc-imaging-001', resource_id: 'res-img-vpc-005', owner: 'Dr. Priya Sharma', start_time: new Date(startDate.getTime() + 29 * DAY_MS + 7 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 29 * DAY_MS + 7.5 * HOUR_MS).toISOString(), change_type: 'hotfix', status: 'completed', description: 'Fixed routing table misconfiguration in modality gateway.' },
    { id: 'dep-012', service_name: 'Data Lake Schema Migration', account_id: 'acc-analytics-003', resource_id: 'res-anl-s3-011', owner: 'Anita Patel', start_time: new Date(startDate.getTime() + 21 * DAY_MS + 18 * HOUR_MS).toISOString(), end_time: new Date(startDate.getTime() + 21 * DAY_MS + 19 * HOUR_MS).toISOString(), change_type: 'config', status: 'completed', description: 'Schema migration for analytics data lake — added new partitioning strategy.' },
  ];

  const insertDeployment = db.prepare(`
    INSERT INTO deployments (id,service_name,account_id,resource_id,owner,start_time,end_time,change_type,status,description)
    VALUES (@id,@service_name,@account_id,@resource_id,@owner,@start_time,@end_time,@change_type,@status,@description)
  `);
  for (const d of deploymentsData) insertDeployment.run(d);
  console.log('[seed] Deployments done.');

  // ── 5. Resource changes ───────────────────────────────────────────────────────
  const resChanges = [
    { id: uuid(), resource_id: 'res-bak-s3-006', account_id: 'acc-backup-002', change_type: 'scale_up', previous_value: JSON.stringify({ storage_tb: 10, retention_days: 30 }), new_value: JSON.stringify({ storage_tb: 30, retention_days: 90 }), timestamp: new Date(startDate.getTime() + 6 * DAY_MS + 13 * HOUR_MS).toISOString(), actor: 'dep-001', reason: 'Backup retention policy change from 30 to 90 days' },
    { id: uuid(), resource_id: 'res-img-ec2-002', account_id: 'acc-imaging-001', change_type: 'scale_up', previous_value: JSON.stringify({ instance_type: 'm5.2xlarge', count: 4 }), new_value: JSON.stringify({ instance_type: 'm5.4xlarge', count: 6 }), timestamp: new Date(startDate.getTime() + 13 * DAY_MS + 8 * HOUR_MS).toISOString(), actor: 'dep-002', reason: 'Scaled up for DICOM compression workload' },
    { id: uuid(), resource_id: 'res-anl-emr-013', account_id: 'acc-analytics-003', change_type: 'scale_up', previous_value: JSON.stringify({ core_nodes: 8, instance_type: 'r5.xlarge' }), new_value: JSON.stringify({ core_nodes: 24, instance_type: 'r5.2xlarge' }), timestamp: new Date(startDate.getTime() + 21 * DAY_MS + 19 * HOUR_MS).toISOString(), actor: 'dep-003', reason: 'Scaled EMR cluster for quarterly ML retraining' },
    { id: uuid(), resource_id: 'res-bak-gla-010', account_id: 'acc-backup-002', change_type: 'config_change', previous_value: JSON.stringify({ tier: 'glacier_flexible' }), new_value: JSON.stringify({ tier: 'glacier_instant' }), timestamp: new Date(startDate.getTime() + 6 * DAY_MS + 12 * HOUR_MS).toISOString(), actor: 'dep-005', reason: 'Migrated to Glacier Instant Retrieval for faster recovery' },
  ];
  const insertChange = db.prepare(`
    INSERT INTO resource_changes (id,resource_id,account_id,change_type,previous_value,new_value,timestamp,actor,reason)
    VALUES (@id,@resource_id,@account_id,@change_type,@previous_value,@new_value,@timestamp,@actor,@reason)
  `);
  for (const c of resChanges) insertChange.run(c);
  console.log('[seed] Resource changes done.');

  // ── 6. Workload metrics ───────────────────────────────────────────────────────
  const metricDefs = {
    's3': [{ type: 'storage_used_gb', base: 12000, unit: 'GB' }, { type: 'requests', base: 45000, unit: 'req/hr' }],
    'ec2': [{ type: 'cpu_pct', base: 62, unit: '%' }, { type: 'memory_pct', base: 54, unit: '%' }],
    'rds': [{ type: 'cpu_pct', base: 48, unit: '%' }, { type: 'storage_used_gb', base: 800, unit: 'GB' }],
    'cloudfront': [{ type: 'requests', base: 120000, unit: 'req/hr' }, { type: 'data_volume_gb', base: 340, unit: 'GB' }],
    'vpc': [{ type: 'data_volume_gb', base: 180, unit: 'GB' }],
    'glacier': [{ type: 'backup_volume_gb', base: 4200, unit: 'GB' }],
    'emr': [{ type: 'cpu_pct', base: 72, unit: '%' }, { type: 'data_volume_gb', base: 2800, unit: 'GB' }],
  };

  let metricCount = 0;
  const insertMetricSql = `INSERT INTO workload_metrics (id,account_id,resource_id,timestamp,metric_type,value,unit) VALUES (@id,@account_id,@resource_id,@timestamp,@metric_type,@value,@unit)`;
  for (let day = 0; day < 30; day++) {
    for (let hour = 0; hour < 24; hour += 4) {
      const ts = new Date(startDate.getTime() + day * DAY_MS + hour * HOUR_MS);
      for (const res of resources) {
        const defs = metricDefs[res.resource_type] || [];
        for (const def of defs) {
          const anomalyMag = isAnomaly(day, hour, res.id);
          const noise = 1 + (rng() - 0.5) * 0.15;
          const value = anomalyMag ? def.base * noise * (1 + anomalyMag * 0.7) : def.base * noise;
          db.prepare(insertMetricSql).run({ id: uuid(), account_id: res.account_id, resource_id: res.id, timestamp: ts.toISOString(), metric_type: def.type, value: Math.round(value * 10) / 10, unit: def.unit });
          metricCount++;
        }
      }
    }
  }
  console.log(`[seed] Workload metrics done (${metricCount} rows).`);


  // ── 7. Anomalies ─────────────────────────────────────────────────────────────
  const anomalyTs1 = new Date(startDate.getTime() + 7 * DAY_MS + 14 * HOUR_MS).toISOString();
  const anomalyTs2 = new Date(startDate.getTime() + 14 * DAY_MS + 9 * HOUR_MS).toISOString();
  const anomalyTs3 = new Date(startDate.getTime() + 22 * DAY_MS + 20 * HOUR_MS).toISOString();
  const anomalyTs4 = new Date(startDate.getTime() + 3 * DAY_MS + 10 * HOUR_MS).toISOString();
  const anomalyTs5 = new Date(startDate.getTime() + 17 * DAY_MS + 2 * HOUR_MS).toISOString();
  const anomalyTs6 = new Date(NOW.getTime() - 2 * HOUR_MS).toISOString();

  const seededAnomalies = [
    {
      id: 'ano-001', account_id: 'acc-backup-002', resource_id: 'res-bak-s3-006',
      timestamp: anomalyTs1, detected_at: new Date(new Date(anomalyTs1).getTime() + 7 * 60000).toISOString(),
      actual_spend: 6160, expected_spend: 2800, deviation_pct: 120.0, z_score: 4.2,
      severity: 'HIGH_PRIORITY', status: 'resolved',
      likely_cause: 'Backup policy change tripled storage retention from 30 to 90 days',
      confidence: 92,
      explanation: "Your cloud storage bill jumped sharply because the backup team extended data retention from 30 to 90 days. This tripled the amount of data being stored, and the cost followed immediately.",
      recommendation: "Review the backup retention policy change (DEP-001). If the 90-day retention was intentional, update the monthly budget forecast. If unintentional, restore the previous 30-day policy to reduce costs.",
    },
    {
      id: 'ano-002', account_id: 'acc-imaging-001', resource_id: 'res-img-ec2-002',
      timestamp: anomalyTs2, detected_at: new Date(new Date(anomalyTs2).getTime() + 6 * 60000).toISOString(),
      actual_spend: 8880, expected_spend: 4800, deviation_pct: 85.0, z_score: 3.6,
      severity: 'HIGH_PRIORITY', status: 'resolved',
      likely_cause: 'DICOM compression deployment scaled up compute cluster from 4 to 6 larger instances',
      confidence: 88,
      explanation: "Imaging compute costs nearly doubled after a new DICOM image compression service was deployed. The new service requires significantly more processing power, so the compute cluster was automatically scaled up.",
      recommendation: "Verify that the DICOM compression feature is delivering expected performance improvements. If compute costs remain elevated, consider optimizing the compression algorithm or scheduling batch jobs during off-peak hours.",
    },
    {
      id: 'ano-003', account_id: 'acc-analytics-003', resource_id: 'res-anl-emr-013',
      timestamp: anomalyTs3, detected_at: new Date(new Date(anomalyTs3).getTime() + 8 * 60000).toISOString(),
      actual_spend: 9570, expected_spend: 5800, deviation_pct: 65.0, z_score: 3.1,
      severity: 'ANOMALY', status: 'resolved',
      likely_cause: 'Quarterly ML model retraining job scaled EMR cluster from 8 to 24 nodes',
      confidence: 85,
      explanation: "The ML processing cluster costs rose significantly during the quarterly model retraining job. The cluster was scaled up to 24 nodes for processing the full hospital dataset. This was a planned but high-cost event.",
      recommendation: "Consider scheduling quarterly retraining jobs during weekends or lower-demand periods. Pre-approve a budget exception for quarterly ML retraining to avoid false anomaly alerts in future.",
    },
    {
      id: 'ano-004', account_id: 'acc-imaging-001', resource_id: 'res-img-cdn-004',
      timestamp: anomalyTs4, detected_at: new Date(new Date(anomalyTs4).getTime() + 9 * 60000).toISOString(),
      actual_spend: 1568, expected_spend: 980, deviation_pct: 60.0, z_score: 2.8,
      severity: 'WARNING', status: 'acknowledged',
      likely_cause: 'CDN cache flush caused origin server surge',
      confidence: 74,
      explanation: "After the CDN cache was flushed, all image requests hit the origin servers directly. This caused a temporary but significant spike in data transfer costs.",
      recommendation: "Implement a gradual cache warm-up strategy after cache flushes. Consider setting CDN cache TTLs more conservatively for frequently accessed DICOM images.",
    },
    {
      id: 'ano-005', account_id: 'acc-imaging-001', resource_id: 'res-img-rds-003',
      timestamp: anomalyTs5, detected_at: new Date(new Date(anomalyTs5).getTime() + 11 * 60000).toISOString(),
      actual_spend: 3150, expected_spend: 2100, deviation_pct: 50.0, z_score: 2.4,
      severity: 'WARNING', status: 'resolved',
      likely_cause: 'Emergency database index rebuild caused I/O spike',
      confidence: 79,
      explanation: "Database costs increased during an emergency index rebuild operation. The rebuild caused high I/O activity which translated into elevated database instance costs for approximately 2 hours.",
      recommendation: "Schedule database maintenance windows during low-traffic periods (2 AM – 6 AM). Index rebuilds should be part of the planned maintenance calendar to avoid anomaly detection noise.",
    },
    {
      id: 'ano-006', account_id: 'acc-backup-002', resource_id: 'res-bak-s3-006',
      timestamp: anomalyTs6, detected_at: new Date(new Date(anomalyTs6).getTime() + 5 * 60000).toISOString(),
      actual_spend: 5320, expected_spend: 2800, deviation_pct: 90.0, z_score: 3.8,
      severity: 'HIGH_PRIORITY', status: 'active',
      likely_cause: 'Unusually large backup job - possible data exfiltration or misconfigured backup scope',
      confidence: 71,
      explanation: "Backup storage costs have spiked sharply in the last 2 hours without any corresponding deployment event. The backup volume is 90% higher than expected. This requires immediate investigation.",
      recommendation: "Immediately review the current backup jobs running on the Backup Object Storage resource. Check for any misconfigured backup scopes or unauthorized data transfers. If the backup job is legitimate, approve the cost exception. If not, terminate the job and initiate an incident review.",
    },
  ];

  const insertAnomaly = db.prepare(`
    INSERT INTO anomalies (id,account_id,resource_id,timestamp,detected_at,actual_spend,expected_spend,deviation_pct,z_score,severity,status,likely_cause,confidence,explanation,recommendation)
    VALUES (@id,@account_id,@resource_id,@timestamp,@detected_at,@actual_spend,@expected_spend,@deviation_pct,@z_score,@severity,@status,@likely_cause,@confidence,@explanation,@recommendation)
  `);
  for (const a of seededAnomalies) insertAnomaly.run(a);
  console.log('[seed] Anomalies done.');

  // ── 8. Evidence ───────────────────────────────────────────────────────────────
  const evidenceData = [
    // ano-001 evidence
    { id: uuid(), anomaly_id: 'ano-001', evidence_type: 'billing_pattern', title: 'Storage cost spike detected', description: 'Hourly storage cost rose from ₹2,800 to ₹6,160 — a 120% increase above baseline.', timestamp: anomalyTs1, value: 120, unit: '%' },
    { id: uuid(), anomaly_id: 'ano-001', evidence_type: 'deployment', title: 'Deployment DEP-001 executed', description: 'Backup Policy Update deployment changed retention from 30→90 days. Executed 1 hour before anomaly onset.', timestamp: new Date(startDate.getTime() + 6 * DAY_MS + 13 * HOUR_MS).toISOString(), value: null, unit: '' },
    { id: uuid(), anomaly_id: 'ano-001', evidence_type: 'metric_spike', title: 'Storage usage tripled', description: 'Backup Object Storage usage jumped from 10,200 GB to 30,800 GB following the retention policy change.', timestamp: anomalyTs1, value: 30800, unit: 'GB' },
    { id: uuid(), anomaly_id: 'ano-001', evidence_type: 'resource_change', title: 'Storage allocation scaled up', description: 'Resource configuration changed: storage_tb 10→30, retention_days 30→90.', timestamp: new Date(startDate.getTime() + 6 * DAY_MS + 13 * HOUR_MS).toISOString(), value: null, unit: '' },
    // ano-002 evidence
    { id: uuid(), anomaly_id: 'ano-002', evidence_type: 'billing_pattern', title: 'Compute cost near-doubled', description: 'Imaging Compute Cluster hourly cost rose from ₹4,800 to ₹8,880 — 85% above expected.', timestamp: anomalyTs2, value: 85, unit: '%' },
    { id: uuid(), anomaly_id: 'ano-002', evidence_type: 'deployment', title: 'DICOM Compression Rollout', description: 'New compression service deployed 1 hour before cost spike. Cluster instance type upgraded from m5.2xlarge to m5.4xlarge.', timestamp: new Date(startDate.getTime() + 13 * DAY_MS + 8 * HOUR_MS).toISOString(), value: null, unit: '' },
    { id: uuid(), anomaly_id: 'ano-002', evidence_type: 'metric_spike', title: 'CPU utilization peaked', description: 'Imaging Compute Cluster CPU utilization reached 94% — up from baseline of 62%.', timestamp: anomalyTs2, value: 94, unit: '%' },
    // ano-006 evidence
    { id: uuid(), anomaly_id: 'ano-006', evidence_type: 'billing_pattern', title: 'Unexpected storage spike — no correlated deployment', description: 'Backup storage cost jumped 90% without any recent deployment event. This is anomalous.', timestamp: anomalyTs6, value: 90, unit: '%' },
    { id: uuid(), anomaly_id: 'ano-006', evidence_type: 'metric_spike', title: 'Backup volume unusually high', description: 'Current backup volume is 8,400 GB — 2.1× the expected 4,000 GB. No scheduled bulk backup was planned.', timestamp: anomalyTs6, value: 8400, unit: 'GB' },
  ];

  const insertEvidence = db.prepare(`
    INSERT INTO evidence (id,anomaly_id,evidence_type,title,description,timestamp,value,unit)
    VALUES (@id,@anomaly_id,@evidence_type,@title,@description,@timestamp,@value,@unit)
  `);
  for (const e of evidenceData) insertEvidence.run(e);
  console.log('[seed] Evidence done.');

  // ── 9. Notifications ──────────────────────────────────────────────────────────
  const notifData = [
    { id: uuid(), anomaly_id: 'ano-001', owner: 'Rajesh Kumar', created_at: anomalyTs1, notification_time: new Date(new Date(anomalyTs1).getTime() + 7.4 * 60000).toISOString(), status: 'acknowledged', acknowledged_at: new Date(new Date(anomalyTs1).getTime() + 22 * 60000).toISOString(), latency_minutes: 7.4 },
    { id: uuid(), anomaly_id: 'ano-002', owner: 'Dr. Priya Sharma', created_at: anomalyTs2, notification_time: new Date(new Date(anomalyTs2).getTime() + 6.2 * 60000).toISOString(), status: 'acknowledged', acknowledged_at: new Date(new Date(anomalyTs2).getTime() + 18 * 60000).toISOString(), latency_minutes: 6.2 },
    { id: uuid(), anomaly_id: 'ano-003', owner: 'Anita Patel', created_at: anomalyTs3, notification_time: new Date(new Date(anomalyTs3).getTime() + 8.5 * 60000).toISOString(), status: 'acknowledged', acknowledged_at: new Date(new Date(anomalyTs3).getTime() + 31 * 60000).toISOString(), latency_minutes: 8.5 },
    { id: uuid(), anomaly_id: 'ano-004', owner: 'Dr. Priya Sharma', created_at: anomalyTs4, notification_time: new Date(new Date(anomalyTs4).getTime() + 9.1 * 60000).toISOString(), status: 'acknowledged', acknowledged_at: null, latency_minutes: 9.1 },
    { id: uuid(), anomaly_id: 'ano-005', owner: 'Dr. Priya Sharma', created_at: anomalyTs5, notification_time: new Date(new Date(anomalyTs5).getTime() + 11.3 * 60000).toISOString(), status: 'acknowledged', acknowledged_at: new Date(new Date(anomalyTs5).getTime() + 28 * 60000).toISOString(), latency_minutes: 11.3 },
    { id: uuid(), anomaly_id: 'ano-006', owner: 'Rajesh Kumar', created_at: anomalyTs6, notification_time: new Date(new Date(anomalyTs6).getTime() + 5.2 * 60000).toISOString(), status: 'sent', acknowledged_at: null, latency_minutes: 5.2 },
  ];
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id,anomaly_id,owner,created_at,notification_time,status,acknowledged_at,latency_minutes)
    VALUES (@id,@anomaly_id,@owner,@created_at,@notification_time,@status,@acknowledged_at,@latency_minutes)
  `);
  for (const n of notifData) insertNotif.run(n);
  console.log('[seed] Notifications done.');

  // ── 10. Audit logs ───────────────────────────────────────────────────────────
  const auditData = [
    { id: uuid(), timestamp: anomalyTs1, actor: 'SpendGuard', action: 'ANOMALY_DETECTED', entity_type: 'anomaly', entity_id: 'ano-001', previous_state: '{}', new_state: JSON.stringify({ severity: 'HIGH_PRIORITY', deviation_pct: 120 }), reason: 'Z-score exceeded HIGH_PRIORITY threshold (4.2 > 3.5)', related_anomaly_id: 'ano-001', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs1).getTime() + 1 * 60000).toISOString(), actor: 'SpendGuard', action: 'EVIDENCE_GENERATED', entity_type: 'evidence', entity_id: 'ano-001', previous_state: '{}', new_state: JSON.stringify({ count: 4 }), reason: 'Auto-generated evidence for HIGH_PRIORITY anomaly', related_anomaly_id: 'ano-001', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs1).getTime() + 7 * 60000).toISOString(), actor: 'SpendGuard', action: 'NOTIFICATION_SENT', entity_type: 'notification', entity_id: 'Rajesh Kumar', previous_state: '{}', new_state: JSON.stringify({ latency_minutes: 7.4 }), reason: 'Owner notified of HIGH_PRIORITY anomaly', related_anomaly_id: 'ano-001', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs1).getTime() + 35 * 60000).toISOString(), actor: 'Admin', action: 'CHANGE_REVIEW_REQUESTED', entity_type: 'change_request', entity_id: 'cr-001', previous_state: '{}', new_state: JSON.stringify({ status: 'pending', risk_level: 'high' }), reason: 'High-impact resource change requires review', related_anomaly_id: 'ano-001', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs1).getTime() + 62 * 60000).toISOString(), actor: 'Dr. Priya Sharma', action: 'CHANGE_APPROVED', entity_type: 'change_request', entity_id: 'cr-001', previous_state: JSON.stringify({ status: 'pending' }), new_state: JSON.stringify({ status: 'approved' }), reason: 'Backup retention confirmed intentional by CTO', related_anomaly_id: 'ano-001', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs1).getTime() + 90 * 60000).toISOString(), actor: 'Rajesh Kumar', action: 'ANOMALY_RESOLVED', entity_type: 'anomaly', entity_id: 'ano-001', previous_state: JSON.stringify({ status: 'active' }), new_state: JSON.stringify({ status: 'resolved' }), reason: 'Backup retention change confirmed as intentional. Budget updated.', related_anomaly_id: 'ano-001', status: 'success' },
    { id: uuid(), timestamp: anomalyTs2, actor: 'SpendGuard', action: 'ANOMALY_DETECTED', entity_type: 'anomaly', entity_id: 'ano-002', previous_state: '{}', new_state: JSON.stringify({ severity: 'HIGH_PRIORITY', deviation_pct: 85 }), reason: 'Z-score exceeded HIGH_PRIORITY threshold (3.6 > 3.5)', related_anomaly_id: 'ano-002', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs2).getTime() + 6 * 60000).toISOString(), actor: 'SpendGuard', action: 'NOTIFICATION_SENT', entity_type: 'notification', entity_id: 'Dr. Priya Sharma', previous_state: '{}', new_state: JSON.stringify({ latency_minutes: 6.2 }), reason: 'Owner notified of HIGH_PRIORITY anomaly', related_anomaly_id: 'ano-002', status: 'success' },
    { id: uuid(), timestamp: anomalyTs3, actor: 'SpendGuard', action: 'ANOMALY_DETECTED', entity_type: 'anomaly', entity_id: 'ano-003', previous_state: '{}', new_state: JSON.stringify({ severity: 'ANOMALY', deviation_pct: 65 }), reason: 'Z-score exceeded ANOMALY threshold (3.1 > 2.5)', related_anomaly_id: 'ano-003', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs3).getTime() + 45 * 60000).toISOString(), actor: 'Anita Patel', action: 'ANOMALY_ACKNOWLEDGED', entity_type: 'anomaly', entity_id: 'ano-003', previous_state: JSON.stringify({ status: 'active' }), new_state: JSON.stringify({ status: 'acknowledged' }), reason: 'Quarterly ML retraining recognized as planned event', related_anomaly_id: 'ano-003', status: 'success' },
    { id: uuid(), timestamp: anomalyTs4, actor: 'SpendGuard', action: 'ANOMALY_DETECTED', entity_type: 'anomaly', entity_id: 'ano-004', previous_state: '{}', new_state: JSON.stringify({ severity: 'WARNING', deviation_pct: 60 }), reason: 'Deviation exceeded WARNING threshold (60% > 30%)', related_anomaly_id: 'ano-004', status: 'success' },
    { id: uuid(), timestamp: anomalyTs5, actor: 'SpendGuard', action: 'ANOMALY_DETECTED', entity_type: 'anomaly', entity_id: 'ano-005', previous_state: '{}', new_state: JSON.stringify({ severity: 'WARNING', deviation_pct: 50 }), reason: 'Deviation exceeded WARNING threshold (50% > 30%)', related_anomaly_id: 'ano-005', status: 'success' },
    { id: uuid(), timestamp: anomalyTs6, actor: 'SpendGuard', action: 'ANOMALY_DETECTED', entity_type: 'anomaly', entity_id: 'ano-006', previous_state: '{}', new_state: JSON.stringify({ severity: 'HIGH_PRIORITY', deviation_pct: 90 }), reason: 'Z-score exceeded HIGH_PRIORITY threshold (3.8 > 3.5)', related_anomaly_id: 'ano-006', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs6).getTime() + 5 * 60000).toISOString(), actor: 'SpendGuard', action: 'NOTIFICATION_SENT', entity_type: 'notification', entity_id: 'Rajesh Kumar', previous_state: '{}', new_state: JSON.stringify({ latency_minutes: 5.2 }), reason: 'Owner notified of HIGH_PRIORITY anomaly', related_anomaly_id: 'ano-006', status: 'success' },
    { id: uuid(), timestamp: new Date(new Date(anomalyTs6).getTime() + 8 * 60000).toISOString(), actor: 'Admin', action: 'CHANGE_REVIEW_REQUESTED', entity_type: 'change_request', entity_id: 'cr-003', previous_state: '{}', new_state: JSON.stringify({ status: 'pending', risk_level: 'critical' }), reason: 'Potential data exfiltration risk — immediate review required', related_anomaly_id: 'ano-006', status: 'success' },
    // System events
    { id: uuid(), timestamp: new Date(NOW.getTime() - 60 * 60000).toISOString(), actor: 'SpendGuard', action: 'MONITORING_STARTED', entity_type: 'system', entity_id: 'simulation', previous_state: JSON.stringify({ is_running: false }), new_state: JSON.stringify({ is_running: true }), reason: 'User started monitoring session', related_anomaly_id: null, status: 'success' },
    { id: uuid(), timestamp: new Date(NOW.getTime() - 30 * 60000).toISOString(), actor: 'SpendGuard', action: 'BASELINE_CALCULATED', entity_type: 'system', entity_id: 'all_resources', previous_state: '{}', new_state: JSON.stringify({ window_hours: 168, resources_processed: 15 }), reason: 'Rolling 7-day baseline recalculated', related_anomaly_id: null, status: 'success' },
  ];

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id,timestamp,actor,action,entity_type,entity_id,previous_state,new_state,reason,related_anomaly_id,status)
    VALUES (@id,@timestamp,@actor,@action,@entity_type,@entity_id,@previous_state,@new_state,@reason,@related_anomaly_id,@status)
  `);
  for (const a of auditData) insertAudit.run(a);
  console.log('[seed] Audit logs done.');

  // ── 11. Change requests ───────────────────────────────────────────────────────
  const crData = [
    { id: 'cr-001', anomaly_id: 'ano-001', resource_id: 'res-bak-s3-006', title: 'Approve Backup Retention Extension to 90 Days', description: 'The backup team extended retention from 30 to 90 days in response to compliance requirements. This change has tripled storage costs. Approval confirms the spend increase is intentional and the budget will be updated.', requester: 'Rajesh Kumar', reviewer: 'Dr. Priya Sharma', status: 'approved', risk_level: 'high', created_at: new Date(new Date(anomalyTs1).getTime() + 35 * 60000).toISOString(), reviewed_at: new Date(new Date(anomalyTs1).getTime() + 62 * 60000).toISOString(), executed_at: new Date(new Date(anomalyTs1).getTime() + 90 * 60000).toISOString(), reason: 'NABH compliance audit requires 90-day data retention for all medical backups.' },
    { id: 'cr-002', anomaly_id: 'ano-002', resource_id: 'res-img-ec2-002', title: 'Review DICOM Compression Compute Scale-Up', description: 'The DICOM compression deployment scaled up the compute cluster from 4 × m5.2xlarge to 6 × m5.4xlarge. This was an auto-scaling event triggered by the new compression workload. Review is required to confirm the configuration is appropriate for ongoing operations.', requester: 'Dr. Priya Sharma', reviewer: 'Anita Patel', status: 'executed', risk_level: 'medium', created_at: new Date(new Date(anomalyTs2).getTime() + 20 * 60000).toISOString(), reviewed_at: new Date(new Date(anomalyTs2).getTime() + 45 * 60000).toISOString(), executed_at: new Date(new Date(anomalyTs2).getTime() + 120 * 60000).toISOString(), reason: 'DICOM compression workload confirmed as permanent. New cluster size is appropriate.' },
    { id: 'cr-003', anomaly_id: 'ano-006', resource_id: 'res-bak-s3-006', title: 'URGENT: Investigate Unexpected Backup Volume Spike', description: 'Backup Object Storage costs have spiked 90% without a corresponding deployment or scheduled backup event. This could indicate a misconfigured backup job, unexpected data growth, or potentially unauthorized access. Immediate investigation is required. Rollback available.', requester: 'Admin', reviewer: null, status: 'pending', risk_level: 'critical', created_at: new Date(new Date(anomalyTs6).getTime() + 8 * 60000).toISOString(), reviewed_at: null, executed_at: null, reason: '' },
  ];
  const insertCR = db.prepare(`
    INSERT INTO change_requests (id,anomaly_id,resource_id,title,description,requester,reviewer,status,risk_level,created_at,reviewed_at,executed_at,reason)
    VALUES (@id,@anomaly_id,@resource_id,@title,@description,@requester,@reviewer,@status,@risk_level,@created_at,@reviewed_at,@executed_at,@reason)
  `);
  for (const cr of crData) insertCR.run(cr);
  console.log('[seed] Change requests done.');

  // ── 12. Rollback actions ──────────────────────────────────────────────────────
  const rbData = [
    { id: uuid(), change_request_id: 'cr-002', resource_id: 'res-img-ec2-002', original_state: JSON.stringify({ instance_type: 'm5.4xlarge', count: 6 }), new_state: JSON.stringify({ instance_type: 'm5.2xlarge', count: 4 }), reason: 'Rollback available if compression workload does not justify compute cost', risk_level: 'medium', approval_status: 'not_required', executed_at: null, rolled_back_at: null },
  ];
  const insertRB = db.prepare(`
    INSERT INTO rollback_actions (id,change_request_id,resource_id,original_state,new_state,reason,risk_level,approval_status,executed_at,rolled_back_at)
    VALUES (@id,@change_request_id,@resource_id,@original_state,@new_state,@reason,@risk_level,@approval_status,@executed_at,@rolled_back_at)
  `);
  for (const rb of rbData) insertRB.run(rb);

  // ── 13. Experiment run ────────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO experiment_runs (id,name,description,baseline_minutes,target_minutes,measured_minutes,improvement_pct,true_positives,true_negatives,false_positives,false_negatives,precision_score,recall_score,f1_score,ran_at)
    VALUES (@id,@name,@description,@baseline_minutes,@target_minutes,@measured_minutes,@improvement_pct,@true_positives,@true_negatives,@false_positives,@false_negatives,@precision_score,@recall_score,@f1_score,@ran_at)
  `).run({
    id: 'exp-001',
    name: 'SpendGuard vs Traditional Budget Alerts — Detection Speed Comparison',
    description: 'Compares the time from abnormal spend onset to accountable-owner notification under the traditional monthly budget alert workflow versus the SpendGuard real-time detection workflow. Experiment ran over the 30-day simulation period.',
    baseline_minutes: 45,
    target_minutes: 10,
    measured_minutes: 7.3,
    improvement_pct: 83.8,
    true_positives: 18,
    true_negatives: 142,
    false_positives: 3,
    false_negatives: 2,
    precision_score: 0.857,
    recall_score: 0.900,
    f1_score: 0.878,
    ran_at: new Date(NOW.getTime() - 1 * HOUR_MS).toISOString(),
  });
  console.log('[seed] Experiment run done.');

  // ── 14. User feedback ─────────────────────────────────────────────────────────
  const feedbackData = [
    { id: uuid(), anomaly_id: 'ano-001', question_1: 5, question_2: 5, question_3: 4, question_4: 5, question_5: 5, comments: 'The plain-English explanation was immediately clear. I did not need to look at any logs.', submitted_at: new Date(NOW.getTime() - 8 * HOUR_MS).toISOString() },
    { id: uuid(), anomaly_id: 'ano-002', question_1: 4, question_2: 4, question_3: 5, question_4: 4, question_5: 5, comments: 'Recommendation was very actionable. Appreciated the confidence score.', submitted_at: new Date(NOW.getTime() - 6 * HOUR_MS).toISOString() },
    { id: uuid(), anomaly_id: 'ano-003', question_1: 4, question_2: 3, question_3: 4, question_4: 5, question_5: 4, comments: 'Dashboard navigation is intuitive. Correlation with deployment was useful context.', submitted_at: new Date(NOW.getTime() - 4 * HOUR_MS).toISOString() },
    { id: uuid(), anomaly_id: null, question_1: 5, question_2: 5, question_3: 5, question_4: 5, question_5: 5, comments: 'This is exactly what we needed. Traditional budget alerts always arrived too late.', submitted_at: new Date(NOW.getTime() - 2 * HOUR_MS).toISOString() },
    { id: uuid(), anomaly_id: 'ano-004', question_1: 3, question_2: 4, question_3: 4, question_4: 4, question_5: 4, comments: 'Good system. Would like to see the ability to mark anomalies as planned/expected events directly from the alert.', submitted_at: new Date(NOW.getTime() - 1 * HOUR_MS).toISOString() },
  ];
  const insertFeedback = db.prepare(`
    INSERT INTO user_feedback (id,anomaly_id,question_1,question_2,question_3,question_4,question_5,comments,submitted_at)
    VALUES (@id,@anomaly_id,@question_1,@question_2,@question_3,@question_4,@question_5,@comments,@submitted_at)
  `);
  for (const f of feedbackData) insertFeedback.run(f);

  // ── 15. Simulation config ─────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO simulation_config (id,is_running,refresh_interval_seconds,warning_threshold,anomaly_threshold,high_priority_threshold,notification_delay_minutes,created_at,updated_at)
    VALUES (1,0,30,15,30,75,2,@created_at,@updated_at)
  `).run({ created_at: NOW.toISOString(), updated_at: NOW.toISOString() });

  // ── 16. Update current_spend on accounts ─────────────────────────────────────
  for (const acc of accounts) {
    const result = db.prepare(`SELECT SUM(actual_spend) as total FROM billing_records WHERE account_id = ? AND timestamp >= ?`).get(acc.id, new Date(NOW.getTime() - 30 * DAY_MS).toISOString());
    db.prepare('UPDATE cloud_accounts SET current_spend = ? WHERE id = ?').run(Math.round(result.total || 0), acc.id);
  }

  console.log('[seed] ✅ All seed data generated successfully.');
}

module.exports = { seed };
