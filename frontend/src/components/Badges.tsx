import clsx from 'clsx';

type Severity = 'NORMAL' | 'WARNING' | 'ANOMALY' | 'HIGH_PRIORITY';

const MAP: Record<Severity, { cls: string; label: string }> = {
  NORMAL:       { cls: 'badge-normal',   label: 'Normal' },
  WARNING:      { cls: 'badge-warning',  label: 'Warning' },
  ANOMALY:      { cls: 'badge-anomaly',  label: 'Anomaly' },
  HIGH_PRIORITY:{ cls: 'badge-critical', label: 'High Priority' },
};

export function SeverityBadge({ severity, size = 'sm' }: { severity: string; size?: 'xs' | 'sm' }) {
  const entry = MAP[severity as Severity] ?? { cls: 'bg-slate-700 text-slate-300 border border-slate-600', label: severity };
  return (
    <span className={clsx('inline-flex items-center rounded-full font-medium', entry.cls, size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs')}>
      {entry.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-red-500/15 text-red-400 border border-red-500/30',
    acknowledged: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    false_positive: 'bg-slate-700 text-slate-400 border border-slate-600',
    pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    rejected: 'bg-red-500/15 text-red-400 border border-red-500/30',
    executed: 'bg-brand-500/15 text-brand-300 border border-brand-500/30',
    rolled_back: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    sent: 'bg-brand-500/15 text-brand-400 border border-brand-500/30',
    completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    running: 'bg-brand-500/15 text-brand-400 border border-brand-500/30',
    failed: 'bg-red-500/15 text-red-400 border border-red-500/30',
  };
  const cls = map[status] ?? 'bg-slate-700 text-slate-400 border border-slate-600';
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', cls)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
