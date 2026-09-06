import { useEffect, useState } from 'react';
import { getChangeRequests, approveChangeRequest, rejectChangeRequest, createChangeRequest, getResources } from '../services/api';
import { StatusBadge } from '../components/Badges';
import { fmtTime } from '../utils/format';
import clsx from 'clsx';

export default function ChangeReview() {
  const [crs, setCrs] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ resourceId: '', title: '', description: '', requester: 'Admin', riskLevel: 'medium' });

  const load = async () => {
    const [c, r] = await Promise.all([getChangeRequests(), getResources()]);
    setCrs(Array.isArray(c) ? c : []);
    setResources(Array.isArray(r) ? r : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => { await approveChangeRequest(id, { reviewer: 'Admin', reason: 'Approved after review' }); load(); };
  const reject  = async (id: string) => { await rejectChangeRequest(id, { reviewer: 'Admin', reason: 'Rejected — cost impact not acceptable' }); load(); };
  const create  = async () => {
    if (!form.resourceId || !form.title) return;
    await createChangeRequest({ ...form, anomalyId: null });
    setShowCreate(false); setForm({ resourceId: '', title: '', description: '', requester: 'Admin', riskLevel: 'medium' });
    load();
  };

  if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading change requests…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Change Review</h1>
          <p className="text-sm text-slate-500">Infrastructure change requests and approvals</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">+ New Request</button>
      </div>

      {showCreate && (
        <div className="card p-5 space-y-3 border-brand-500/30">
          <h2 className="text-sm font-semibold text-slate-100">Create Change Request</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Resource</label>
              <select className="input w-full" value={form.resourceId} onChange={e => setForm(f => ({ ...f, resourceId: e.target.value }))}>
                <option value="">Select resource…</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Risk Level</label>
              <select className="input w-full" value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input className="input w-full" placeholder="e.g. Increase storage quota for DICOM backups" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea className="input w-full h-20 resize-none" placeholder="Justify the change and expected cost impact…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="btn-primary">Submit</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {crs.map(cr => (
          <div key={cr.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={cr.status} />
                  <span className={clsx('text-xs px-2 py-0.5 rounded border',
                    cr.risk_level === 'high' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                    cr.risk_level === 'medium' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                    'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  )}>{cr.risk_level} risk</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{cr.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{cr.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Requester: {cr.requester}</span>
                  {cr.reviewer && <span>Reviewer: {cr.reviewer}</span>}
                  <span>Created: {fmtTime(cr.created_at)}</span>
                </div>
              </div>
              {cr.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => approve(cr.id)} className="btn-primary text-xs">Approve</button>
                  <button onClick={() => reject(cr.id)} className="btn-danger text-xs">Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
