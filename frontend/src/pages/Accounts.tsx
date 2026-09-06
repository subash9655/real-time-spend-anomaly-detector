import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import { getAccounts } from '../services/api';
import { StatusBadge } from '../components/Badges';
import { fmtCurrency } from '../utils/format';
import clsx from 'clsx';

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAccounts().then(d => setAccounts(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading accounts…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Cloud Accounts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Hospital cloud infrastructure accounts · Simulation environment</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const budgetPct = acc.monthly_budget ? (acc.current_spend / acc.monthly_budget) * 100 : 0;
          const barColor  = budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-brand-500';
          return (
            <div key={acc.id} onClick={() => navigate(`/accounts/${acc.id}`)}
              className="card card-hover p-5 cursor-pointer space-y-4">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-brand-500/15">
                  <Cloud size={18} className="text-brand-400" />
                </div>
                <StatusBadge status={acc.status} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">{acc.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{acc.account_type} · {acc.region}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Budget utilization</span>
                  <span className={clsx('font-semibold', budgetPct > 90 ? 'text-red-400' : budgetPct > 70 ? 'text-amber-400' : 'text-slate-300')}>{Math.round(budgetPct)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full">
                  <div className={clsx('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="section-title">Current Spend</p>
                  <p className="text-slate-100 font-bold mt-0.5">{fmtCurrency(acc.current_spend)}</p>
                </div>
                <div>
                  <p className="section-title">Budget</p>
                  <p className="text-slate-100 font-bold mt-0.5">{fmtCurrency(acc.monthly_budget)}</p>
                </div>
                <div>
                  <p className="section-title">Owner</p>
                  <p className="text-slate-300 mt-0.5">{acc.owner}</p>
                </div>
                <div>
                  <p className="section-title">Active Anomalies</p>
                  <p className={clsx('font-bold mt-0.5', acc.active_anomalies > 0 ? 'text-red-400' : 'text-emerald-400')}>{acc.active_anomalies}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
