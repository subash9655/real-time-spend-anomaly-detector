import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, History, Cloud, Server, Rocket,
  Activity, Bell, FlaskConical, Bug, ClipboardList, GitPullRequest,
  RotateCcw, Users, Settings, Shield, X, Menu, Wifi, WifiOff
} from 'lucide-react';
import clsx from 'clsx';
import { useWs } from '../contexts/WsContext';
import { useState } from 'react';

const NAV = [
  { label: 'Overview',      to: '/',              icon: LayoutDashboard },
  { label: 'Active Anomalies', to: '/anomalies/active',   icon: AlertTriangle },
  { label: 'History',       to: '/anomalies/history',icon: History },
  { label: 'Cloud Accounts',to: '/accounts',       icon: Cloud },
  { label: 'Resources',     to: '/resources',      icon: Server },
  { label: 'Deployments',   to: '/deployments',    icon: Rocket },
  { label: 'Workloads',     to: '/workloads',      icon: Activity },
  { label: 'Alerts',        to: '/alerts',         icon: Bell },
  { label: 'Experiments',   to: '/experiments',    icon: FlaskConical },
  { label: 'Failure Cases', to: '/failure-cases',  icon: Bug },
  { label: 'Audit Trail',   to: '/audit',          icon: ClipboardList },
  { label: 'Change Review', to: '/change-review',  icon: GitPullRequest },
  { label: 'Rollback',      to: '/rollback',       icon: RotateCcw },
  { label: 'User Validation',to: '/validation',    icon: Users },
  { label: 'Settings',      to: '/settings',       icon: Settings },
];

function NavItem({ item, onClick }: { item: typeof NAV[0]; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClick}
      className={({ isActive }) => clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
      )}
    >
      <item.icon size={15} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { isConnected, anomalyCount } = useWs();

  return (
    <aside className={clsx(
      'flex flex-col h-full bg-surface-900 border-r border-slate-800',
      mobile ? 'w-72' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 leading-none">SpendGuard</div>
            <div className="text-xs text-slate-500 mt-0.5">FinOps Monitor</div>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-100">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Environment badge */}
      <div className="px-4 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-amber-400 font-medium">Simulation / Demo</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <div key={item.to} className="relative">
            <NavItem item={item} onClick={onClose} />
            {item.to === '/anomalies/active' && anomalyCount > 0 && (
              <span className="absolute right-3 top-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {anomalyCount > 9 ? '9+' : anomalyCount}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom: live status + user */}
      <div className="px-4 py-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          {isConnected
            ? <><Wifi size={12} className="text-emerald-400" /><span className="text-emerald-400">Live</span></>
            : <><WifiOff size={12} className="text-slate-500" /><span className="text-slate-500">Connecting…</span></>
          }
        </div>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-slate-800/50">
          <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400">A</div>
          <div>
            <div className="text-xs font-medium text-slate-200">Admin</div>
            <div className="text-xs text-slate-500">spendguard.demo</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { anomalyCount } = useWs();

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-brand-400" />
          <span className="text-sm font-bold text-slate-100">SpendGuard</span>
        </div>
        <div className="flex items-center gap-3">
          {anomalyCount > 0 && (
            <div className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {anomalyCount > 9 ? '9+' : anomalyCount}
            </div>
          )}
          <button onClick={() => setOpen(true)} className="p-1.5 text-slate-400 hover:text-slate-100">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
