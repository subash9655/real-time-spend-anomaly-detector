import { useEffect, useState } from 'react';
import { RotateCcw, ArrowLeftRight } from 'lucide-react';
import { getRollbacks, executeRollback, getDeployments } from '../services/api';
import { StatusBadge } from '../components/Badges';

interface RollbackRecord {
  id: string;
  deployment_id: string;
  resource_name: string;
  reason: string;
  initiated_by: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  timestamp: string;
}

export function Rollback() {
  const [rollbacks, setRollbacks] = useState<RollbackRecord[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [selectedDep, setSelectedDep] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRollbacks = () => {
    Promise.all([
      getRollbacks().catch(() => []),
      getDeployments().catch(() => [])
    ]).then(([rData, dData]) => {
      setRollbacks(rData);
      setDeployments(dData);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchRollbacks();
  }, []);

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDep || !reason) return;
    setSubmitting(true);
    try {
      await executeRollback({ deployment_id: selectedDep, reason, initiated_by: 'FinOps Engineer' });
      setSelectedDep('');
      setReason('');
      fetchRollbacks();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <RotateCcw className="animate-spin h-8 w-8 text-primary-500 mr-3" />
        <span>Loading rollback history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-rose-400" />
          Infrastructure Rollback Actions
        </h1>
        <p className="text-sm text-surface-400">
          Simulated automated and manual deployment rollbacks for rapid spend containment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trigger Rollback Form */}
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-semibold text-surface-200 mb-4 flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-rose-400" />
            Initiate Rollback Action
          </h2>
          <form onSubmit={handleRollback} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-surface-400 mb-1">
                Target Deployment
              </label>
              <select
                value={selectedDep}
                onChange={(e) => setSelectedDep(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 text-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                required
              >
                <option value="">Select deployment to roll back...</option>
                {deployments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.id} - {d.service_name} ({d.deployment_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-surface-400 mb-1">
                Rollback Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Unintended provisioned throughput spike causing hourly budget breach..."
                className="w-full bg-surface-950 border border-surface-800 text-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 h-24 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {submitting ? 'Executing Rollback...' : 'Execute Simulated Rollback'}
            </button>
          </form>
        </div>

        {/* Rollback Log */}
        <div className="lg:col-span-2 bg-surface-900/60 border border-surface-800/80 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">Rollback History Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-800 text-surface-400 text-xs font-semibold uppercase">
                  <th className="pb-3">Rollback ID</th>
                  <th className="pb-3">Deployment</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Initiated By</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {rollbacks.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-800/30 transition-colors text-surface-300">
                    <td className="py-3 font-mono text-xs text-rose-300 font-semibold">{r.id}</td>
                    <td className="py-3 font-mono text-xs text-surface-300">{r.deployment_id}</td>
                    <td className="py-3 text-xs text-surface-300">{r.reason}</td>
                    <td className="py-3 text-xs text-surface-400">{r.initiated_by}</td>
                    <td className="py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
