import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { getWorkloadSummary, getWorkloads } from '../services/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface MetricRecord {
  id: string;
  resource_id: string;
  resource_name: string;
  metric_type: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface SummaryItem {
  resource_id: string;
  resource_name: string;
  service_type: string;
  avg_cpu?: number;
  avg_memory?: number;
  avg_storage?: number;
  avg_requests?: number;
}

export function Workloads() {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getWorkloadSummary().catch(() => []),
      getWorkloads().catch(() => [])
    ]).then(([sumData, metricData]) => {
      setSummary(sumData);
      setMetrics(metricData);
      setLoading(false);
    });
  }, []);

  const filteredMetrics = selectedResource === 'all'
    ? metrics
    : metrics.filter(m => m.resource_id === selectedResource);

  // Group metrics by hour for chart display
  const chartDataMap: Record<string, any> = {};
  filteredMetrics.slice(0, 100).forEach(m => {
    const timeKey = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!chartDataMap[timeKey]) chartDataMap[timeKey] = { time: timeKey };
    chartDataMap[timeKey][m.metric_type] = m.value;
  });
  const chartData = Object.values(chartDataMap);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <Activity className="animate-spin h-8 w-8 text-primary-500 mr-3" />
        <span>Loading workload metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary-400" />
            Infrastructure Workload Metrics
          </h1>
          <p className="text-sm text-surface-400">
            Real-time CPU, Memory, IOPS, and Storage utilization correlated with spend behavior
          </p>
        </div>

        <select
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value)}
          className="bg-surface-900 border border-surface-800 text-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
        >
          <option value="all">All Resources</option>
          {summary.map(s => (
            <option key={s.resource_id} value={s.resource_id}>
              {s.resource_name} ({s.service_type})
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.slice(0, 4).map((item) => (
          <div key={item.resource_id} className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-surface-200 text-sm">{item.resource_name}</span>
              <span className="text-xs uppercase bg-surface-800 text-surface-400 px-2 py-0.5 rounded font-mono">
                {item.service_type}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {item.avg_cpu !== undefined && (
                <div className="flex justify-between text-surface-400">
                  <span>Avg CPU:</span>
                  <span className="font-mono text-surface-200 font-semibold">{item.avg_cpu}%</span>
                </div>
              )}
              {item.avg_memory !== undefined && (
                <div className="flex justify-between text-surface-400">
                  <span>Avg Memory:</span>
                  <span className="font-mono text-surface-200 font-semibold">{item.avg_memory}%</span>
                </div>
              )}
              {item.avg_storage !== undefined && (
                <div className="flex justify-between text-surface-400">
                  <span>Avg Storage:</span>
                  <span className="font-mono text-surface-200 font-semibold">{item.avg_storage} GB</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics Chart */}
      <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-4">Metric Trends Over Time</h2>
        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="cpu_pct" name="CPU %" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="memory_pct" name="Memory %" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="storage_used_gb" name="Storage GB" stroke="#10b981" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="requests" name="Requests / hr" stroke="#f59e0b" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-surface-400 text-sm">No metric data available for the selected resource.</p>
        )}
      </div>

      {/* Live Stream Table */}
      <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-4">Recent Metric Sample Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-xs font-semibold uppercase">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Resource</th>
                <th className="pb-3">Metric</th>
                <th className="pb-3">Value</th>
                <th className="pb-3">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {filteredMetrics.slice(0, 15).map((m) => (
                <tr key={m.id} className="hover:bg-surface-800/30 transition-colors text-surface-300">
                  <td className="py-2.5 font-mono text-xs text-surface-400">
                    {new Date(m.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 font-medium text-surface-200">{m.resource_name}</td>
                  <td className="py-2.5">
                    <span className="font-mono text-xs bg-surface-800 text-primary-300 px-2 py-0.5 rounded">
                      {m.metric_type}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono font-semibold text-surface-100">{m.value}</td>
                  <td className="py-2.5 text-xs text-surface-400">{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
