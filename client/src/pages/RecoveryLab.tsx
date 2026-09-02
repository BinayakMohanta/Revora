import { useState } from 'react';
import { toast } from 'sonner';
import { Play, Loader2, FlaskConical, AlertOctagon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../services/api';
import { formatINR, formatINRFull, cn, ACTION_LABELS, FAILURE_LABELS } from '../lib/format';
import { StatusPill } from '../components/StatusPill';

const BATCH_OPTIONS = [25, 50, 100];
const RETRY_OPTIONS = [1, 2, 3];
const PROB_OPTIONS = [50, 60, 70];
const CONTACT_OPTIONS = [1, 2, 3];
const THRESHOLD_OPTIONS = [10000, 25000, 50000];
const FAILURE_OPTIONS = ['bank_decline', 'insufficient_funds', 'expired_card', 'checkout_abandonment', 'subscription_failure'];

const OUTCOME_COLORS: Record<string, string> = {
  recovered: '#34d399',
  escalated: '#fbbf24',
  stopped: '#f87171',
  pending: '#d99a45',
};

const FAILURE_SCENARIOS = [
  { key: 'api_unavailable', label: 'Payment API unavailable' },
  { key: 'duplicate_request', label: 'Duplicate recovery request' },
  { key: 'retry_limit', label: 'Retry limit exceeded' },
  { key: 'contact_limit', label: 'Customer contact limit exceeded' },
  { key: 'unknown_state', label: 'Unknown payment state' },
];

export default function RecoveryLab() {
  const [batchSize, setBatchSize] = useState(50);
  const [failureMix, setFailureMix] = useState<string[]>([]);
  const [maxRetries, setMaxRetries] = useState(2);
  const [minProb, setMinProb] = useState(50);
  const [maxContacts, setMaxContacts] = useState(2);
  const [threshold, setThreshold] = useState(25000);
  const [running, setRunning] = useState(false);
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [blockResult, setBlockResult] = useState<any>(null);

  function toggleFailure(f: string) {
    setFailureMix((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  async function runAgent() {
    setRunning(true);
    setProcessedRows([]);
    setSummary(null);
    setBlockResult(null);
    try {
      const res = await api.simulate({
        batchSize,
        failureMix,
        maxRetries,
        minRecoveryProbability: minProb,
        maxContacts,
        highValueThreshold: threshold,
      });

      // Animate rows appearing progressively
      for (let i = 0; i < res.results.length; i++) {
        setProcessedRows((prev) => [...prev, res.results[i]]);
        if (i < 20) await wait(35);
      }
      setSummary(res.summary);
      toast.success(`Batch complete — ${res.summary.recovered !== undefined ? '' : ''}${formatINR(res.summary.recoveredRevenue)} recovered`);
    } catch (e: any) {
      toast.error(e.message || 'Simulation failed');
    } finally {
      setRunning(false);
    }
  }

  async function triggerFailure(scenario: string) {
    if (processedRows.length === 0) {
      toast.error('Run the agent first to select a transaction context.');
      return;
    }
    const txnId = processedRows[0].transaction.id;
    try {
      const res = await api.simulateFailure(txnId, scenario);
      setBlockResult(res);
    } catch (e: any) {
      toast.error(e.message || 'Failed to simulate failure');
    }
  }

  const outcomeData = summary
    ? [
        { name: 'Recovered', value: processedRows.filter((r) => r.outcome === 'recovered').length },
        { name: 'Pending', value: processedRows.filter((r) => r.outcome === 'pending').length },
        { name: 'Escalated', value: summary.escalated },
        { name: 'Stopped', value: summary.stopped },
      ]
    : [];

  const failureDist = FAILURE_OPTIONS.map((f) => ({
    reason: FAILURE_LABELS[f],
    count: processedRows.filter((r) => r.transaction.failureReason === f).length,
  })).filter((d) => d.count > 0);

  const actionPerf = Object.entries(
    processedRows.reduce((acc: Record<string, { total: number; recovered: number }>, r) => {
      const a = r.transaction.recommendedAction;
      if (!acc[a]) acc[a] = { total: 0, recovered: 0 };
      acc[a].total += 1;
      if (r.outcome === 'recovered') acc[a].recovered += 1;
      return acc;
    }, {})
  ).map(([action, v]) => ({ action: ACTION_LABELS[action] || action, ...v }));

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-cream-100 tracking-tight flex items-center gap-2">
          <FlaskConical size={22} className="text-gold-400" /> Recovery Lab
        </h1>
        <p className="text-sm text-cream-400 mt-1">Test Revora against a controlled batch before it touches production.</p>
      </div>

      <div className="panel p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <OptionGroup label="Batch Size" options={BATCH_OPTIONS} value={batchSize} onChange={setBatchSize} suffix="" />
          <OptionGroup label="Max Retries" options={RETRY_OPTIONS} value={maxRetries} onChange={setMaxRetries} suffix="" />
          <OptionGroup label="Min Recovery Probability" options={PROB_OPTIONS} value={minProb} onChange={setMinProb} suffix="%" />
          <OptionGroup label="Max Customer Contacts" options={CONTACT_OPTIONS} value={maxContacts} onChange={setMaxContacts} suffix="" />
          <OptionGroup label="High-Value Threshold" options={THRESHOLD_OPTIONS} value={threshold} onChange={setThreshold} suffix="" format={formatINR} />
        </div>

        <div>
          <p className="text-xs font-medium text-cream-400 uppercase tracking-wide mb-2">Failure Mix (empty = all)</p>
          <div className="flex flex-wrap gap-2">
            {FAILURE_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => toggleFailure(f)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                  failureMix.includes(f) ? 'bg-gold-500 border-gold-500 text-base-950' : 'border-base-600 text-cream-300 hover:border-base-500'
                )}
              >
                {FAILURE_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={runAgent}
            disabled={running}
            className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-base-950 font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run Agent
          </button>
          <div className="flex flex-wrap gap-2">
            {FAILURE_SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => triggerFailure(s.key)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-red-900/40 text-red-300 hover:border-red-700 transition-colors"
              >
                <AlertOctagon size={12} /> {s.label}
              </button>
            ))}
          </div>
        </div>

        {blockResult && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/40">
            <p className="text-sm font-semibold text-red-300 mb-1">ACTION BLOCKED</p>
            <p className="text-sm text-red-200 mb-2">{blockResult.message}</p>
            <p className="text-xs text-cream-400">Policy: {blockResult.policy}</p>
            <p className="text-xs text-cream-400">Next step: {blockResult.nextStep}</p>
          </div>
        )}
      </div>

      {processedRows.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="p-4 border-b border-base-700/60">
            <h3 className="text-sm font-semibold text-cream-100">Batch Processing</h3>
          </div>
          <div className="overflow-x-auto scrollbar-thin max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-base-900">
                <tr className="border-b border-base-700/60 text-left">
                  {['Transaction', 'Amount', 'Diagnosis', 'Probability', 'Action', 'Policy', 'Result'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-medium text-cream-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedRows.map((r, i) => (
                  <tr key={r.transaction.id + i} className="border-b border-base-700/30 last:border-0 animate-fade-up">
                    <td className="px-4 py-2.5 mono text-cream-200 whitespace-nowrap">{r.transaction.id}</td>
                    <td className="px-4 py-2.5 mono text-cream-100 whitespace-nowrap">{formatINRFull(r.transaction.amount)}</td>
                    <td className="px-4 py-2.5 text-cream-300 whitespace-nowrap max-w-[200px] truncate">{r.transaction.diagnosis}</td>
                    <td className="px-4 py-2.5 mono text-gold-400 whitespace-nowrap">{r.transaction.recoveryProbability}%</td>
                    <td className="px-4 py-2.5 text-cream-300 whitespace-nowrap">{ACTION_LABELS[r.transaction.recommendedAction]}</td>
                    <td className="px-4 py-2.5 text-xs text-cream-400 whitespace-nowrap">{r.outcome === 'recovered' || r.outcome === 'pending' ? 'PASSED' : r.outcome.toUpperCase()}</td>
                    <td className="px-4 py-2.5"><StatusPill status={r.transaction.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-cream-100 mb-3">Batch Results</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Transactions Processed', value: summary.processed },
                { label: 'Revenue at Risk', value: formatINR(summary.revenueAtRisk) },
                { label: 'Recovered', value: formatINR(summary.recoveredRevenue) },
                { label: 'Recovery Rate', value: `${summary.recoveryRate}%` },
                { label: 'Escalated', value: summary.escalated },
                { label: 'Stopped', value: summary.stopped },
                { label: 'Avg Recovery Probability', value: `${summary.averageRecoveryProbability}%` },
                { label: 'Avg Recovery Time', value: `${summary.averageRecoveryTimeMinutes}m` },
              ].map((m) => (
                <div key={m.label} className="panel p-4">
                  <p className="text-xs text-cream-400 uppercase tracking-wide mb-1">{m.label}</p>
                  <p className="text-xl font-semibold text-cream-100 mono">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-cream-100 mb-4">Recovery Outcome</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {outcomeData.map((d, i) => (
                      <Cell key={i} fill={OUTCOME_COLORS[d.name.toLowerCase()] || '#4a4133'} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12, color: '#b8ab91' }} />
                  <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="panel p-5">
              <h3 className="text-sm font-semibold text-cream-100 mb-4">Failure Reason Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={failureDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242019" vertical={false} />
                  <XAxis dataKey="reason" tick={{ fill: '#b8ab91', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#d99a45" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-cream-100 mb-4">Action Performance</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={actionPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242019" vertical={false} />
                  <XAxis dataKey="action" tick={{ fill: '#b8ab91', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#b8ab91' }} />
                  <Bar dataKey="total" name="Total" fill="#4a4133" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="recovered" name="Recovered" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
  suffix,
  format,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  format?: (n: number) => string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-cream-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              'flex-1 text-xs font-medium py-2 rounded-lg border transition-colors',
              value === o ? 'bg-gold-500 border-gold-500 text-base-950' : 'border-base-600 text-cream-300 hover:border-base-500'
            )}
          >
            {format ? format(o) : `${o}${suffix}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
