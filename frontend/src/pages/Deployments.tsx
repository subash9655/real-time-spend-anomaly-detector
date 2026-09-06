import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { getDeployments } from '../services/api';
import { StatusBadge } from '../components/Badges';
import { fmtTime, fmtRelative } from '../utils/format';
import clsx from 'clsx';

export default function Deployments() {
  const [deps, setDeps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDeployments().then(d => setDeps(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading deployments…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Deployments</h1>
        <p className="text-sm text-slate-500">Service changes correlated with cost events</p>
      </div>

      <div className="grid gap-3">
        {deps.map(d => (
          <div key={d.id} onClick={() => navigate(`/deployments/${d.id}`)}
            className="card card-hover p-5 cursor-pointer flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={clsx('mt-0.5 p-2 rounded-lg flex-shrink-0',
                d.change_type === 'feature' ? 'bg-brand-500/15' :
                d.change_type === 'scale' ? 'bg-orange-500/15' : 'bg-slate-700'
              )}>
                <Rocket size={16} className={
                  d.change_type === 'feature' ? 'text-brand-400' :
                  d.change_type === 'scale' ? 'text-orange-400' : 'text-slate-400'
                } />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-100">{d.service_name}</span>
                  <StatusBadge status={d.status} />
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">{d.change_type}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{d.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>{d.resource_name}</span>
                  <span>·</span>
                  <span>{d.account_name?.replace('Hospital ','')}</span>
                  <span>·</span>
                  <span>{d.owner}</span>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="text-slate-300 font-medium">{fmtTime(d.start_time)}</p>
              <p className="mt-0.5">{fmtRelative(d.start_time)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
