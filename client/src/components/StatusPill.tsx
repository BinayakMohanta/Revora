import { cn, STATUS_LABELS } from '../lib/format';

const STATUS_STYLES: Record<string, string> = {
  failed: 'text-red-300 border-red-800/40 bg-red-950/30',
  pending: 'text-cream-300 border-base-600 bg-base-800/60',
  ready: 'text-gold-400 border-gold-700/40 bg-gold-950/20',
  in_progress: 'text-blue-300 border-blue-800/40 bg-blue-950/20',
  recovered: 'text-emerald-300 border-emerald-800/40 bg-emerald-950/20',
  escalated: 'text-amber-300 border-amber-800/40 bg-amber-950/20',
  stopped: 'text-red-300 border-red-800/40 bg-red-950/20',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('tag', STATUS_STYLES[status] || 'text-cream-300 border-base-600')}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const RISK_STYLES: Record<string, string> = {
  low: 'text-emerald-300 border-emerald-800/40 bg-emerald-950/20',
  medium: 'text-amber-300 border-amber-800/40 bg-amber-950/20',
  high: 'text-red-300 border-red-800/40 bg-red-950/20',
};

export function RiskPill({ risk }: { risk: string }) {
  return <span className={cn('tag', RISK_STYLES[risk] || '')}>{risk}</span>;
}
