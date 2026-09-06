export function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

export function fmtCurrency(n: number): string {
  return '₹' + fmt(n);
}

export function fmtPct(n: number): string {
  const v = Math.round(Math.abs(n) * 10) / 10;
  return (n >= 0 ? '+' : '-') + v + '%';
}

export function fmtTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fmtRelative(iso: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function deviationColor(pct: number): string {
  if (Math.abs(pct) < 15) return 'text-emerald-400';
  if (Math.abs(pct) < 30) return 'text-amber-400';
  if (Math.abs(pct) < 75) return 'text-orange-400';
  return 'text-red-400';
}
