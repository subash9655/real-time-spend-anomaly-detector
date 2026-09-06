import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResources } from '../services/api';
import { fmtCurrency, deviationColor } from '../utils/format';
import clsx from 'clsx';

const ICON_COLOR: Record<string, string> = {
  s3: 'text-orange-400', ec2: 'text-brand-400', rds: 'text-emerald-400',
  cloudfront: 'text-purple-400', vpc: 'text-cyan-400', glacier: 'text-slate-400', emr: 'text-pink-400',
};

export default function Resources() {
  const [resources, setResources] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getResources().then(d => setResources(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  const filtered = resources.filter(r =>
    !filter || r.name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.resource_type?.includes(filter.toLowerCase()) ||
    r.account_name?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading resources…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Cloud Resources</h1>
          <p className="text-sm text-slate-500">{resources.length} resources across all accounts</p>
        </div>
        <input className="input w-56" placeholder="Search resources…" value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['Type','Name','Account','Expected/hr','Latest Spend','Deviation','Anomalies','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map(r => {
              const dev = r.latest_spend && r.expected_cost_per_hour
                ? ((r.latest_spend - r.expected_cost_per_hour) / r.expected_cost_per_hour) * 100 : 0;
              return (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-mono font-bold uppercase', ICON_COLOR[r.resource_type] || 'text-slate-400')}>
                      {r.resource_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-slate-400">{r.account_name?.replace('Hospital ','')}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{fmtCurrency(r.expected_cost_per_hour)}</td>
                  <td className="px-4 py-3 text-slate-100 font-mono">{r.latest_spend ? fmtCurrency(r.latest_spend) : '—'}</td>
                  <td className={clsx('px-4 py-3 font-mono font-semibold', deviationColor(dev))}>
                    {r.latest_spend ? `${dev >= 0 ? '+' : ''}${Math.round(dev)}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('font-bold', r.active_anomalies > 0 ? 'text-red-400' : 'text-emerald-400')}>
                      {r.active_anomalies}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/resources/${r.id}`)} className="btn-ghost py-1">Details</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
