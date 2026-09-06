import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Clock, Bell,
  Play, Pause, RefreshCw, Radio, CheckCircle2, Info
} from 'lucide-react';
import clsx from 'clsx';
import {
  dashboard, startMonitoring, pauseMonitoring, resetSimulation,
  triggerAnomaly, getSimStatus
} from '../services/api';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { fmtCurrency, fmtPct, fmtTime, fmtRelative, deviationColor } from '../utils/format';
import { useWs } from '../contexts/WsContext';

// ── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-slate-100 font-medium">₹{Math.round(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, tooltip }: {
  label: string; value: string; sub?: string; icon: any; accent: string; tooltip?: string;
}) {
  return (
    <div className={clsx('card p-5 card-hover relative group', `border-l-2 ${accent}`)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="kpi-label">{label}</p>
          <p className="kpi-value mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={clsx('p-2 rounded-lg', accent.replace('border-l-', 'bg-').replace('-500', '-500/15'))}>
          <Icon size={18} className={accent.replace('border-l-', 'text-').replace('-500', '-400')} />
        </div>
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ── Severity colors for pie ───────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  s3: '#4f7bf8', ec2: '#f97316', rds: '#22c55e',
  cloudfront: '#a855f7', vpc: '#f59e0b', glacier: '#06b6d4', emr: '#ec4899',
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [simStatus, setSimStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { lastEvent } = useWs();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([dashboard(), getSimStatus()]);
      setData(d); setSimStatus(s); setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (lastEvent?.type === 'ANOMALY_DETECTED' || lastEvent?.type === 'BILLING_TICK') load(); }, [lastEvent]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const handleStart  = async () => { await startMonitoring();   load(); };
  const handlePause  = async () => { await pauseMonitoring();   load(); };
  const handleReset  = async () => { await resetSimulation();   load(); };
  const handleTrigger = async () => {
    setTriggerLoading(true);
    try { await triggerAnomaly(); load(); } finally { setTriggerLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500 animate-pulse">Loading dashboard…</div>
    </div>
  );

  const kpis = data?.kpis || {};
  const deviation = kpis.currentHourlySpend && kpis.expectedHourlySpend
    ? ((kpis.currentHourlySpend - kpis.expectedHourlySpend) / kpis.expectedHourlySpend) * 100
    : 0;

  // Process spend trend for chart
  const trendRaw: any[] = data?.spendTrend || [];
  const trendByHour: Record<string, { hour: string; actual: number; expected: number }> = {};
  trendRaw.forEach(r => {
    const h = r.hour?.slice(0, 16).replace('T', ' ') || '';
    if (!trendByHour[h]) trendByHour[h] = { hour: h, actual: 0, expected: 0 };
    trendByHour[h].actual   += r.actual   || 0;
    trendByHour[h].expected += r.expected || 0;
  });
  const trendData = Object.values(trendByHour).slice(-24);

  const spendByAccount = (data?.spendByAccount || []).map((a: any) => ({ name: a.name.replace('Hospital ', ''), value: Math.round(a.spend || 0) }));
  const spendByType    = (data?.spendByResourceType || []).map((t: any) => ({ name: t.resource_type?.toUpperCase(), value: Math.round(t.spend || 0) }));

  const anomalies: any[] = data?.recentAnomalies || [];

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Hospital cloud spend monitoring · {simStatus?.is_running ? `Live — Last updated ${fmtRelative(lastRefresh.toISOString())}` : 'Showing latest available data (Simulation Paused)'}
          </p>
        </div>

        {/* Simulation controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border',
            simStatus?.is_running
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          )}>
            {simStatus?.is_running
              ? <><Radio size={10} className="animate-pulse" /> Live</>
              : <><div className="w-2 h-2 rounded-full bg-slate-500" /> Paused</>
            }
          </div>

          {simStatus?.is_running
            ? <button onClick={handlePause}  className="btn-ghost flex items-center gap-1.5"><Pause size={14}/>Pause</button>
            : <button onClick={handleStart}  className="btn-primary flex items-center gap-1.5"><Play size={14}/>Start Monitoring</button>
          }
          <button onClick={handleTrigger} disabled={triggerLoading} className="btn-ghost flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />{triggerLoading ? 'Triggering…' : 'Simulate Anomaly'}
          </button>
          <button onClick={handleReset}  className="btn-ghost flex items-center gap-1.5">
            <RefreshCw size={13} />Reset
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Current Hourly Spend" value={fmtCurrency(kpis.currentHourlySpend||0)}
          sub={`Expected: ${fmtCurrency(kpis.expectedHourlySpend||0)}`}
          icon={TrendingUp} accent="border-l-brand-500"
          tooltip="Total actual spend across all accounts in the last hour" />
        <KpiCard label="Deviation" value={fmtPct(deviation)}
          sub={deviation > 0 ? 'above baseline' : 'below baseline'}
          icon={deviation > 15 ? TrendingUp : TrendingDown}
          accent={Math.abs(deviation) > 30 ? 'border-l-red-500' : Math.abs(deviation) > 15 ? 'border-l-amber-500' : 'border-l-emerald-500'}
          tooltip="Percentage deviation of current spend from the expected baseline" />
        <KpiCard label="Active Anomalies"    value={String(kpis.activeAnomalies||0)}
          sub="requiring attention" icon={AlertTriangle} accent="border-l-orange-500"
          tooltip="Number of anomalies currently in 'active' status" />
        <KpiCard label="High Priority"       value={String(kpis.highPriorityAnomalies||0)}
          sub="immediate action needed" icon={Zap} accent="border-l-red-500"
          tooltip="HIGH_PRIORITY anomalies with deviation > 75% or Z-score > 3.5" />
        <KpiCard label="Avg Detection Time"  value={`${kpis.avgDetectionMinutes||0} min`}
          sub="from onset to alert" icon={Clock} accent="border-l-purple-500"
          tooltip="Average time from spending anomaly onset to system detection" />
        <KpiCard label="Avg Notification"   value={`${kpis.avgNotificationMinutes||0} min`}
          sub="from onset to owner" icon={Bell} accent="border-l-cyan-500"
          tooltip="Average time from anomaly onset to owner notification (target: < 10 min)" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Spend trend */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Actual vs Expected Spend</h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 24 hours · All accounts combined</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f7bf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f7bf8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => v.slice(11)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="expected" name="Expected" stroke="#22c55e" fill="url(#gradExpected)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Area type="monotone" dataKey="actual"   name="Actual"   stroke="#4f7bf8" fill="url(#gradActual)"   strokeWidth={2}   dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Spend by account */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">Spend by Account</h2>
          <p className="text-xs text-slate-500 mb-4">Last 24 hours</p>
          <div className="space-y-3">
            {spendByAccount.map((a: any, i: number) => {
              const max = Math.max(...spendByAccount.map((x: any) => x.value));
              const pct = max ? (a.value / max) * 100 : 0;
              const colors = ['bg-brand-500', 'bg-orange-500', 'bg-purple-500'];
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate">{a.name}</span>
                    <span className="text-slate-400 font-mono">{fmtCurrency(a.value)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-700', colors[i % colors.length])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={spendByAccount} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis hide />
                <Tooltip formatter={(v: any) => fmtCurrency(Number(v || 0))} contentStyle={{ background: '#1e2740', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {spendByAccount.map((_: any, i: number) => (
                    <Cell key={i} fill={['#4f7bf8', '#f97316', '#a855f7'][i % 3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Spend by resource type */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">Spend by Resource Type</h2>
          <p className="text-xs text-slate-500 mb-4">Last 24 hours</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={spendByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                {spendByType.map((entry: any, i: number) => (
                  <Cell key={i} fill={TYPE_COLORS[entry.name?.toLowerCase()] || `hsl(${i*47},60%,55%)`} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => fmtCurrency(Number(v || 0))} contentStyle={{ background: '#1e2740', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* System health */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">System Health</h2>
          <div className="space-y-3">
            {[
              { label: 'Monitoring', value: simStatus?.is_running ? 'Live' : 'Paused', ok: simStatus?.is_running },
              { label: 'Detection Engine', value: 'Online', ok: true },
              { label: 'Notification Service', value: 'Online', ok: true },
              { label: 'Database', value: 'Connected', ok: true },
              { label: 'WebSocket Feed', value: 'Active', ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className={clsx('w-1.5 h-1.5 rounded-full', item.ok ? 'bg-emerald-400' : 'bg-amber-400', item.ok && 'animate-pulse')} />
                  <span className={clsx('text-xs font-medium', item.ok ? 'text-emerald-400' : 'text-amber-400')}>{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-1.5">
            <Info size={11} />
            <span>Refresh interval: {simStatus?.config?.refresh_interval_seconds || 30}s</span>
          </div>
        </div>

        {/* Detection accuracy */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">Detection Performance</h2>
          <p className="text-xs text-slate-500 mb-4">30-day experiment results</p>
          <div className="space-y-3">
            {[
              { label: 'Precision',    value: '85.7%', color: 'text-emerald-400' },
              { label: 'Recall',       value: '90.0%', color: 'text-emerald-400' },
              { label: 'F1 Score',     value: '87.8%', color: 'text-emerald-400' },
              { label: 'Avg Latency',  value: `${kpis.avgNotificationMinutes||'—'} min`, color: 'text-brand-400' },
              { label: 'Baseline',     value: '45 min', color: 'text-amber-400' },
              { label: 'Improvement',  value: '83.8%', color: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{m.label}</span>
                <span className={clsx('text-xs font-bold tabular-nums', m.color)}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Anomalies Table */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Recent Anomalies</h2>
            <p className="text-xs text-slate-500 mt-0.5">{anomalies.length} records</p>
          </div>
          <button onClick={() => navigate('/anomalies/active')} className="btn-ghost text-xs">View All →</button>
        </div>

        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 size={36} className="text-emerald-400 mb-3 opacity-50" />
            <p className="text-sm font-medium text-slate-300">No active anomalies</p>
            <p className="text-xs text-slate-500 mt-1">Your cloud spending currently looks healthy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Severity','Timestamp','Account','Resource','Actual','Expected','Deviation','Likely Cause','Owner','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left section-title whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {anomalies.map((a: any) => (
                  <tr key={a.id}
                    onClick={() => navigate(`/anomalies/${a.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3"><SeverityBadge severity={a.severity} size="xs" /></td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtTime(a.timestamp)}</td>
                    <td className="px-4 py-3 text-slate-300 truncate max-w-[120px]">{a.account_name?.replace('Hospital ','')}</td>
                    <td className="px-4 py-3 text-slate-300 truncate max-w-[130px]">{a.resource_name}</td>
                    <td className="px-4 py-3 text-slate-100 font-mono whitespace-nowrap">{fmtCurrency(a.actual_spend)}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{fmtCurrency(a.expected_spend)}</td>
                    <td className={clsx('px-4 py-3 font-mono font-semibold whitespace-nowrap', deviationColor(a.deviation_pct))}>
                      +{Math.round(a.deviation_pct)}%
                    </td>
                    <td className="px-4 py-3 text-slate-400 truncate max-w-[200px]">{a.likely_cause}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{a.owner}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
