import { useEffect, useState } from 'react';
import { getAudit } from '../services/api';
import { fmtTime } from '../utils/format';
import clsx from 'clsx';

const ACTION_COLOR: Record<string, string> = {
  ANOMALY_DETECTED: 'text-orange-400',
  NOTIFICATION_SENT: 'text-brand-400',
  MONITORING_STARTED: 'text-emerald-400',
  MONITORING_PAUSED: 'text-amber-400',
  CHANGE_APPROVED: 'text-emerald-400',
  CHANGE_REJECTED: 'text-red-400',
  ROLLBACK_EXECUTED: 'text-purple-400',
};

export default function AuditTrail() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getAudit({ limit: '200' }).then(d => setLogs(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => !filter ||
    l.action?.toLowerCase().includes(filter.toLowerCase()) ||
    l.actor?.toLowerCase().includes(filter.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading audit log…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Audit Trail</h1>
          <p className="text-sm text-slate-500">All system events with actor, action, and state</p>
        </div>
        <input className="input w-56" placeholder="Filter events…" value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['Timestamp','Actor','Action','Entity Type','Entity','Reason','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30 font-mono">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtTime(l.timestamp)}</td>
                <td className="px-4 py-2.5 text-slate-300">{l.actor}</td>
                <td className={clsx('px-4 py-2.5 font-semibold whitespace-nowrap', ACTION_COLOR[l.action] || 'text-slate-400')}>{l.action}</td>
                <td className="px-4 py-2.5 text-slate-500">{l.entity_type}</td>
                <td className="px-4 py-2.5 text-slate-400 truncate max-w-[140px]">{l.entity_id}</td>
                <td className="px-4 py-2.5 text-slate-400 truncate max-w-[200px] font-sans">{l.reason}</td>
                <td className="px-4 py-2.5">
                  <span className={clsx('text-xs font-medium', l.status === 'success' ? 'text-emerald-400' : 'text-red-400')}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
