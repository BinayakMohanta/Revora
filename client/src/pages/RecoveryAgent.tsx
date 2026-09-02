import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Play, Loader2, Bot } from 'lucide-react';
import { api } from '../services/api';
import { AgentPipeline } from '../components/AgentPipeline';
import { AgentTimeline, TimelineEvent } from '../components/AgentTimeline';
import { formatINRFull, formatINR, cn } from '../lib/format';
import { Transaction } from '../types';

const STAGE_COUNT = 7;

export default function RecoveryAgent() {
  const [pending, setPending] = useState<Transaction[]>([]);
  const [running, setRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [outcome, setOutcome] = useState<'recovered' | 'escalated' | 'stopped' | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [metrics, setMetrics] = useState({ analyzed: 0, executed: 0, recovered: 0, escalations: 0, stopped: 0 });
  const [current, setCurrent] = useState<Transaction | null>(null);

  async function loadPending() {
    const { transactions } = await api.transactions({ filter: 'all' });
    setPending(transactions.filter((t: Transaction) => ['ready', 'pending', 'failed'].includes(t.status)));
    const dash = await api.dashboard(30);
    setMetrics({
      analyzed: dash.transactionsAnalyzed,
      executed: dash.transactionsAnalyzed - dash.escalated - dash.stopped,
      recovered: Math.round((dash.recoveredRevenue > 0 ? dash.transactionsAnalyzed * (dash.recoveryRate / 100) : 0)),
      escalations: dash.escalated,
      stopped: dash.stopped,
    });
  }

  useEffect(() => {
    loadPending();
    api.audit('all').then(({ events }) =>
      setEvents(events.slice(0, 20).map((e: any) => ({ id: e.id, timestamp: e.timestamp, event: e.event, meta: e.decision, result: e.result })))
    );
  }, []);

  function pushEvent(text: string, result = 'info', meta?: string) {
    setEvents((prev) => [{ id: `${Date.now()}_${Math.random()}`, timestamp: new Date().toISOString(), event: text, meta, result }, ...prev].slice(0, 40));
  }

  async function runAgentOn(txn: Transaction) {
    setRunning(true);
    setCurrent(txn);
    setOutcome(null);
    setActiveIndex(0);
    pushEvent(`Detected failed payment — ${txn.id}`, 'info', txn.customerName);
    await wait(400);

    setActiveIndex(1);
    pushEvent(`Revenue at risk: ${formatINRFull(txn.amount)}`, 'info');
    await wait(400);
    pushEvent('Fetching customer history', 'info');
    await wait(350);

    setActiveIndex(2);
    pushEvent(`Diagnosis: ${txn.diagnosis}`, 'info');
    await wait(400);
    pushEvent(`Recovery probability: ${txn.recoveryProbability}%`, 'info');
    await wait(350);

    setActiveIndex(3);
    await wait(400);

    setActiveIndex(4);
    await wait(300);

    try {
      const res = await api.execute(txn.id);
      if (res.blocked) {
        pushEvent('Policy check failed', 'blocked', res.message);
        setActiveIndex(6);
        const outc = res.transaction.status === 'escalated' ? 'escalated' : 'stopped';
        setOutcome(outc);
        pushEvent(outc === 'escalated' ? 'Escalated to merchant operations' : 'Action blocked / stopped', outc === 'escalated' ? 'escalated' : 'blocked', res.message);
        toast.error(res.message);
      } else {
        pushEvent('Policy check passed', 'success');
        await wait(300);
        setActiveIndex(5);
        pushEvent(`Action executed: ${res.transaction.recommendedAction.replace(/_/g, ' ')}`, 'success');
        await wait(500);
        setActiveIndex(6);
        if (res.transaction.status === 'recovered') {
          setOutcome('recovered');
          pushEvent('Payment recovered', 'recovered');
          toast.success('Payment recovered successfully.');
        } else if (res.transaction.status === 'escalated') {
          setOutcome('escalated');
          pushEvent('Escalated to merchant operations', 'escalated');
          toast.info('Escalated for human review.');
        } else {
          setOutcome('stopped');
          pushEvent('Recovery attempt requires follow-up', 'info');
          toast.success(res.message);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Agent run failed');
    } finally {
      setRunning(false);
      await loadPending();
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100 tracking-tight flex items-center gap-2">
            <Bot size={22} className="text-gold-400" /> Recovery Agent
          </h1>
          <p className="text-sm text-cream-400 mt-1">Autonomous revenue recovery with bounded execution.</p>
        </div>
        <span className="tag border-gold-700/30 bg-gold-500/5 text-gold-400">DEMO</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Transactions Analyzed', value: metrics.analyzed },
          { label: 'Actions Executed', value: metrics.executed },
          { label: 'Recovered Revenue', value: metrics.recovered, suffix: '' },
          { label: 'Escalations', value: metrics.escalations },
          { label: 'Stopped Actions', value: metrics.stopped },
        ].map((m) => (
          <div key={m.label} className="panel p-4">
            <p className="text-xs text-cream-400 uppercase tracking-wide mb-1">{m.label}</p>
            <p className="text-xl font-semibold text-cream-100 mono">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-cream-100">Agent Pipeline</h3>
          {current && (
            <span className="text-xs text-cream-400">
              Processing <span className="text-cream-100 font-medium">{current.id}</span> — {current.customerName}
            </span>
          )}
        </div>
        <AgentPipeline activeIndex={activeIndex} outcome={outcome} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 panel p-5">
          <h3 className="text-sm font-semibold text-cream-100 mb-3">Queued Transactions</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {pending.slice(0, 12).map((t) => (
              <button
                key={t.id}
                disabled={running}
                onClick={() => runAgentOn(t)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg border border-base-700/60 hover:border-gold-700/40 transition-colors flex items-center justify-between disabled:opacity-50'
                )}
              >
                <div>
                  <p className="text-sm text-cream-100">{t.customerName}</p>
                  <p className="text-xs text-cream-400 mono">{t.id} · {formatINR(t.amount)}</p>
                </div>
                {running ? <Loader2 size={14} className="text-gold-400 animate-spin" /> : <Play size={14} className="text-gold-400" />}
              </button>
            ))}
            {pending.length === 0 && <p className="text-sm text-cream-400 py-6 text-center">Queue is clear.</p>}
          </div>
        </div>

        <div className="lg:col-span-2 panel p-5">
          <h3 className="text-sm font-semibold text-cream-100 mb-3">Live Event Stream</h3>
          <AgentTimeline events={events} />
        </div>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
