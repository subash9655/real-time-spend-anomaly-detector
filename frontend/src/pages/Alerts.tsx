import { useEffect, useState } from 'react';
import { getAlerts, acknowledgeAlert } from '../services/api';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { fmtTime } from '../utils/format';
import { CheckCheck } from 'lucide-react';
import clsx from 'clsx';

export default function Alerts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => getAlerts().then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const ack = async (id: string) => { await acknowledgeAlert(id); load(); };

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading alerts…</div>;

  const notifs: any[] = data?.notifications || [];
  const stats = data?.stats || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Alert Notifications</h1>
        <p className="text-sm text-slate-500">Owner notification history and latency analysis</p>
      </div>

      {/* Latency Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Notifications', value: stats.total },
          { label: 'Avg Latency', value: `${stats.avgLatency} min` },
          { label: 'Min Latency', value: `${stats.minLatency} min` },
          { label: 'Max Latency', value: `${stats.maxLatency} min` },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="kpi-label">{s.label}</p>
            <p className="kpi-value mt-1">{s.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Notifications Table */}
      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">Notification Log</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['Severity','Resource','Account','Owner','Created','Notified','Latency','Status','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {notifs.map(n => (
              <tr key={n.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3"><SeverityBadge severity={n.severity} size="xs" /></td>
                <td className="px-4 py-3 text-slate-300">{n.resource_name}</td>
                <td className="px-4 py-3 text-slate-400">{n.account_name?.replace('Hospital ','')}</td>
                <td className="px-4 py-3 text-slate-300">{n.owner}</td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtTime(n.created_at)}</td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtTime(n.notification_time)}</td>
                <td className={clsx('px-4 py-3 font-mono font-bold', n.latency_minutes < 10 ? 'text-emerald-400' : n.latency_minutes < 20 ? 'text-amber-400' : 'text-red-400')}>
                  {n.latency_minutes} min
                </td>
                <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                <td className="px-4 py-3">
                  {n.status === 'sent' && (
                    <button onClick={() => ack(n.id)} className="btn-ghost py-0.5 text-xs flex items-center gap-1">
                      <CheckCheck size={11} />Ack
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
