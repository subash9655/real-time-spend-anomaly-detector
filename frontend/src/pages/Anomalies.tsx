import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, CheckCircle2, User, FileText, Lightbulb, Shield } from 'lucide-react';
import { getAnomalies, getAnomaly, updateAnomalyStatus } from '../services/api';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { fmtCurrency, fmtTime, deviationColor } from '../utils/format';
import clsx from 'clsx';

// ── Active Anomalies List ─────────────────────────────────────────────────────
export function ActiveAnomalies() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAnomalies({ status: 'active' })
      .then(d => setAnomalies(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = anomalies.filter(a =>
    !filter ||
    a.severity === filter ||
    a.account_name?.toLowerCase().includes(filter.toLowerCase()) ||
    a.resource_name?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading anomalies…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Active Anomalies</h1>
          <p className="text-sm text-slate-500">{anomalies.length} active — real-time monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input w-48" placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} />
          {['HIGH_PRIORITY','ANOMALY','WARNING'].map(s => (
            <button key={s} onClick={() => setFilter(filter === s ? '' : s)}
              className={clsx('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
                filter === s ? 'bg-slate-700 border-slate-500 text-slate-100' : 'border-slate-700 text-slate-400 hover:border-slate-600'
              )}>
              {s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20">
          <CheckCircle2 size={48} className="text-emerald-400 opacity-40 mb-4" />
          <p className="text-slate-300 font-medium">No active anomalies</p>
          <p className="text-slate-500 text-sm mt-1">Cloud spending looks healthy right now.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['ID','Severity','Detected','Account','Resource','Type','Root Cause','Actual','Expected','Deviation','Notified','Status','Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap" title={a.id}>{a.id.split('-')[0]}…</td>
                  <td className="px-4 py-3"><SeverityBadge severity={a.severity} size="xs" /></td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtTime(a.timestamp)}</td>
                  <td className="px-4 py-3 text-slate-300">{a.account_name?.replace('Hospital ','')}</td>
                  <td className="px-4 py-3 text-slate-300 font-medium">{a.resource_name}</td>
                  <td className="px-4 py-3 text-slate-400 uppercase">{a.resource_type || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[150px] truncate" title={a.likely_cause}>{a.likely_cause || '-'}</td>
                  <td className="px-4 py-3 text-slate-100 font-mono">{fmtCurrency(a.actual_spend)}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{fmtCurrency(a.expected_spend)}</td>
                  <td className={clsx('px-4 py-3 font-mono font-semibold', deviationColor(a.deviation_pct))}>+{Math.round(a.deviation_pct)}%</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{a.notification_time ? fmtTime(a.notification_time) : '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/anomalies/${a.id}`)} className="btn-primary py-1 px-3 text-xs whitespace-nowrap">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Anomaly History ────────────────────────────────────────────────────────────
export function AnomalyHistory() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAnomalies({ limit: '100' }).then(d => setAnomalies(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading history…</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-100">Anomaly History</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['Severity','Detected','Account','Resource','Actual','Expected','Deviation','Z-Score','Status','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {anomalies.map(a => (
              <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3"><SeverityBadge severity={a.severity} size="xs" /></td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtTime(a.detected_at)}</td>
                <td className="px-4 py-3 text-slate-300">{a.account_name?.replace('Hospital ','')}</td>
                <td className="px-4 py-3 text-slate-300">{a.resource_name}</td>
                <td className="px-4 py-3 text-slate-100 font-mono">{fmtCurrency(a.actual_spend)}</td>
                <td className="px-4 py-3 text-slate-400 font-mono">{fmtCurrency(a.expected_spend)}</td>
                <td className={clsx('px-4 py-3 font-mono font-semibold', deviationColor(a.deviation_pct))}>+{Math.round(a.deviation_pct)}%</td>
                <td className="px-4 py-3 text-slate-400 font-mono">{a.z_score?.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/anomalies/${a.id}`)} className="btn-ghost py-1 text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Anomaly Detail ─────────────────────────────────────────────────────────────
export function AnomalyDetail() {
  const { id } = useParams();
  const [a, setA] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    if (!id) return;
    getAnomaly(id).then(setA).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const resolve = async () => {
    if (!id) return;
    await updateAnomalyStatus(id, 'resolved', 'Manually resolved by admin');
    load();
  };
  const fp = async () => {
    if (!id) return;
    await updateAnomalyStatus(id, 'false_positive', 'Marked as false positive');
    load();
  };

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading anomaly…</div>;
  if (!a) return <div className="text-slate-400 p-8">Anomaly not found.</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <button onClick={() => navigate('/anomalies/active')} className="hover:text-slate-300">Anomalies</button>
        <ChevronRight size={12} />
        <span className="text-slate-300">{a.id}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SeverityBadge severity={a.severity} />
              <StatusBadge status={a.status} />
            </div>
            <h1 className="text-lg font-bold text-slate-100">{a.resource_name}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{a.account_name} · {fmtTime(a.timestamp)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-100">{fmtCurrency(a.actual_spend)}</p>
            <p className={clsx('text-sm font-semibold mt-1', deviationColor(a.deviation_pct))}>+{Math.round(a.deviation_pct)}% above expected</p>
            <p className="text-xs text-slate-500">Expected: {fmtCurrency(a.expected_spend)}</p>
          </div>
        </div>

        {/* Action buttons */}
        {a.status === 'active' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
            <button onClick={resolve} className="btn-primary text-xs">Mark Resolved</button>
            <button onClick={fp} className="btn-ghost text-xs">False Positive</button>
          </div>
        )}
      </div>

      {/* Non-specialist explanation */}
      <div className="card p-6 border-l-2 border-l-brand-500">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-100">What happened?</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{a.explanation}</p>

        <div className="grid sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-800">
          <div>
            <p className="section-title mb-1">Likely Cause</p>
            <p className="text-xs text-slate-300">{a.likely_cause}</p>
          </div>
          <div>
            <p className="section-title mb-1">Confidence</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${a.confidence}%` }} />
              </div>
              <span className="text-xs font-bold text-brand-400">{a.confidence}%</span>
            </div>
          </div>
          <div>
            <p className="section-title mb-1">Z-Score</p>
            <p className="text-xs font-mono text-slate-300">{a.z_score?.toFixed(2)} σ</p>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="card p-6 border-l-2 border-l-amber-500">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-100">What to do next</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{a.recommendation}</p>
      </div>

      {/* Evidence Timeline */}
      {a.evidence?.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-100">Evidence Timeline</h2>
          </div>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-800" />
            <div className="space-y-5">
              {a.evidence.map((ev: any) => (
                <div key={ev.id} className="relative">
                  <div className={clsx('absolute -left-6 w-2.5 h-2.5 rounded-full border-2 border-surface-900',
                    ev.evidence_type === 'deployment' ? 'bg-brand-400' :
                    ev.evidence_type === 'metric_spike' ? 'bg-orange-400' :
                    ev.evidence_type === 'resource_change' ? 'bg-purple-400' : 'bg-slate-400'
                  )} />
                  <div className="text-xs text-slate-500 mb-1">{fmtTime(ev.timestamp)}</div>
                  <p className="text-xs font-semibold text-slate-200">{ev.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                  {ev.value && <span className="inline-block mt-1 text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">{ev.value} {ev.unit}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {a.notifications?.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-100">Owner Notifications</h2>
          </div>
          {a.notifications.map((n: any) => (
            <div key={n.id} className="flex items-center justify-between text-xs p-3 bg-slate-800/40 rounded-lg">
              <div>
                <span className="text-slate-300 font-medium">{n.owner}</span>
                <span className="text-slate-500 ml-2">notified at {fmtTime(n.notification_time)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-brand-400 font-bold">{n.latency_minutes} min latency</span>
                <StatusBadge status={n.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Anomalies({ mode }: { mode?: 'active' | 'history' }) {
  return mode === 'history' ? <AnomalyHistory /> : <ActiveAnomalies />;
}
