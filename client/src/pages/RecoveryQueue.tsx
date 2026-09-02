import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import { StatusPill, RiskPill } from '../components/StatusPill';
import { TransactionDrawer } from '../components/TransactionDrawer';
import { formatINRFull, ACTION_LABELS, FAILURE_LABELS, cn } from '../lib/format';
import { Transaction } from '../types';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'high_value', label: 'High Value' },
  { key: 'high_probability', label: 'High Probability' },
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'recovered', label: 'Recovered' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'stopped', label: 'Stopped' },
];

export default function RecoveryQueue() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { transactions } = await api.transactions({ filter, search: search || undefined });
      setTransactions(transactions);
    } catch {
      toast.error('Could not load recovery queue.');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function handleUpdated(updated: Transaction) {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelected(updated);
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-cream-100 tracking-tight">Recovery Queue</h1>
        <p className="text-sm text-cream-400 mt-1">Every recoverable rupee, prioritized by expected recovery value.</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                filter === f.key
                  ? 'bg-gold-500 border-gold-500 text-base-950'
                  : 'border-base-600 text-cream-300 hover:border-base-500'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or transaction ID"
            className="w-full bg-base-800/60 border border-base-700/60 rounded-lg pl-9 pr-3 py-2 text-sm text-cream-100 placeholder:text-cream-400/60 focus:outline-none focus:border-gold-700/50"
          />
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-700/60 text-left">
                {['Transaction', 'Customer', 'Amount', 'Failure Reason', 'Recovery Prob.', 'Recommended Action', 'Risk', 'Status', 'Next Action'].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-cream-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-base-700/30">
                    <td colSpan={9} className="px-4 py-4"><div className="h-4 shimmer rounded" /></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-cream-400">
                    No transactions match this filter. The recovery queue is clear.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="border-b border-base-700/30 last:border-0 hover:bg-base-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5 mono text-cream-200 whitespace-nowrap">{t.id}</td>
                    <td className="px-4 py-3.5 text-cream-100 whitespace-nowrap">{t.customerName}</td>
                    <td className="px-4 py-3.5 mono text-cream-100 whitespace-nowrap">{formatINRFull(t.amount)}</td>
                    <td className="px-4 py-3.5 text-cream-300 whitespace-nowrap">{FAILURE_LABELS[t.failureReason]}</td>
                    <td className="px-4 py-3.5 mono text-gold-400 whitespace-nowrap">{t.recoveryProbability}%</td>
                    <td className="px-4 py-3.5 text-cream-300 whitespace-nowrap">{ACTION_LABELS[t.recommendedAction]}</td>
                    <td className="px-4 py-3.5"><RiskPill risk={t.actionRisk} /></td>
                    <td className="px-4 py-3.5"><StatusPill status={t.status} /></td>
                    <td className="px-4 py-3.5 text-cream-400 whitespace-nowrap text-xs">
                      {t.status === 'recovered' ? '—' : t.status === 'escalated' ? 'Awaiting human review' : t.status === 'stopped' ? 'None' : 'Ready to execute'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <TransactionDrawer transaction={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />}
    </div>
  );
}
