import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ScrollText } from 'lucide-react';
import { api } from '../services/api';
import { formatDateTime, cn } from '../lib/format';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'actions', label: 'Actions' },
  { key: 'escalations', label: 'Escalations' },
  { key: 'exceptions', label: 'Exceptions' },
  { key: 'blocked', label: 'Blocked' },
];

const RESULT_STYLE: Record<string, string> = {
  success: 'text-emerald-300 border-emerald-800/40 bg-emerald-950/20',
  recovered: 'text-emerald-300 border-emerald-800/40 bg-emerald-950/20',
  blocked: 'text-red-300 border-red-800/40 bg-red-950/20',
  stopped: 'text-red-300 border-red-800/40 bg-red-950/20',
  escalated: 'text-amber-300 border-amber-800/40 bg-amber-950/20',
  info: 'text-cream-300 border-base-600 bg-base-800/40',
};

export default function AuditTrail() {
  const [filter, setFilter] = useState('all');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { events } = await api.audit(filter);
      setEvents(events);
    } catch {
      toast.error('Could not load audit trail.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-cream-100 tracking-tight flex items-center gap-2">
          <ScrollText size={22} className="text-gold-400" /> Audit Trail
        </h1>
        <p className="text-sm text-cream-400 mt-1">Every decision. Every action. Every boundary.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
              filter === f.key ? 'bg-gold-500 border-gold-500 text-base-950' : 'border-base-600 text-cream-300 hover:border-base-500'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-700/60 text-left">
                {['Timestamp', 'Transaction', 'Event', 'Decision', 'Policy', 'Actor', 'Result'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-cream-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-base-700/30">
                    <td colSpan={7} className="px-4 py-4"><div className="h-4 shimmer rounded" /></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-cream-400">No audit events for this filter.</td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="border-b border-base-700/30 last:border-0 hover:bg-base-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-cream-400 mono whitespace-nowrap">{formatDateTime(e.timestamp)}</td>
                    <td className="px-4 py-3 mono text-cream-200 whitespace-nowrap">{e.transactionId}</td>
                    <td className="px-4 py-3 text-cream-100 max-w-[280px]">{e.event}</td>
                    <td className="px-4 py-3 text-cream-400 text-xs max-w-[240px]">{e.decision || '—'}</td>
                    <td className="px-4 py-3 text-cream-400 text-xs max-w-[200px]">{e.policy || '—'}</td>
                    <td className="px-4 py-3 text-cream-300 capitalize whitespace-nowrap">{e.actor}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn('tag', RESULT_STYLE[e.result] || RESULT_STYLE.info)}>{e.result}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
