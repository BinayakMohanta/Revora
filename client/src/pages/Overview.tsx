import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  TrendingUp,
  Percent,
  Activity,
  FileCheck,
  ArrowUpRight,
  Ban,
  Gauge,
  Trophy,
  Play,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { KpiCard } from '../components/KpiCard';
import { RevenueTrendChart } from '../components/RevenueTrendChart';
import { AgentTimeline, TimelineEvent } from '../components/AgentTimeline';
import { formatINR } from '../lib/format';
import { cn } from '../lib/format';

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

export default function Overview() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [simRunning, setSimRunning] = useState(false);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const data = await api.dashboard(days);
      setDashboard(data);
    } catch (e) {
      toast.error('Could not load dashboard. Is the API running on :5000?');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const { events } = await api.audit('all');
      setEvents(
        events.slice(0, 25).map((e: any) => ({
          id: e.id,
          timestamp: e.timestamp,
          event: e.event,
          meta: e.decision || (e.transactionId ? e.transactionId : undefined),
          result: e.result,
        }))
      );
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  async function runSimulation() {
    setSimRunning(true);
    const toastId = toast.loading('Revora agent is processing transactions...');
    try {
      const res = await api.simulate({ batchSize: 50, failureMix: [], maxRetries: 2, minRecoveryProbability: 50, maxContacts: 2, highValueThreshold: 25000 });
      toast.success(
        `Simulation complete — ${res.summary.recoveredRevenue ? formatINR(res.summary.recoveredRevenue) : '₹0'} recovered across ${res.summary.processed} transactions`,
        { id: toastId }
      );
      await load(range);
      await loadAudit();
    } catch (e) {
      toast.error('Simulation failed. Check API connection.', { id: toastId });
    } finally {
      setSimRunning(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-cream-100 tracking-tight">
            Revenue recovery, running on autopilot.
          </h1>
          <p className="text-sm text-cream-400 mt-1.5 max-w-xl">
            Revora finds failed revenue, decides the next best intervention, and executes within
            merchant-defined safety boundaries.
          </p>
        </div>
        <button
          onClick={runSimulation}
          disabled={simRunning}
          className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-base-950 font-semibold px-5 py-2.5 rounded-lg transition-colors shrink-0"
        >
          {simRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Run Recovery Simulation
        </button>
      </div>

      {loading || !dashboard ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="panel p-5 h-28 shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Revenue at Risk" value={formatINR(dashboard.revenueAtRisk)} icon={AlertTriangle} delay={0.02} />
          <KpiCard label="Recovered Revenue" value={formatINR(dashboard.recoveredRevenue)} icon={TrendingUp} accent delay={0.04} />
          <KpiCard label="Recovery Rate" value={`${dashboard.recoveryRate}%`} icon={Percent} delay={0.06} />
          <KpiCard label="Active Recoveries" value={String(dashboard.activeRecoveries)} icon={Activity} delay={0.08} />
          <KpiCard label="Transactions Analyzed" value={String(dashboard.transactionsAnalyzed)} icon={FileCheck} delay={0.1} />
          <KpiCard label="Escalated" value={String(dashboard.escalated)} icon={ArrowUpRight} delay={0.12} />
          <KpiCard label="Stopped" value={String(dashboard.stopped)} icon={Ban} delay={0.14} />
          <KpiCard label="Avg Recovery Probability" value={`${dashboard.averageRecoveryProbability}%`} icon={Gauge} delay={0.16} />
        </div>
      )}

      {dashboard && (
        <KpiCard
          label="Largest Recovered Transaction"
          value={formatINR(dashboard.largestRecoveredTransaction)}
          icon={Trophy}
          accent
          delay={0.18}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-cream-100">Revenue Recovery Trend</h3>
              <p className="text-xs text-cream-400 mt-0.5">Risk, recovered, and failed revenue over time</p>
            </div>
            <div className="flex items-center gap-1 bg-base-800/60 rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRange(r.days)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                    range === r.days ? 'bg-gold-500 text-base-950' : 'text-cream-400 hover:text-cream-100'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {dashboard ? (
            <RevenueTrendChart data={dashboard.timeSeries} />
          ) : (
            <div className="h-[300px] shimmer rounded-lg" />
          )}
        </div>

        <div className="panel p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-cream-100">Agent Activity</h3>
            <p className="text-xs text-cream-400 mt-0.5">Live decision & action stream</p>
          </div>
          <AgentTimeline events={events} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="panel p-5 text-xs text-cream-400 flex items-center gap-2"
      >
        <span className="tag text-gold-400 border-gold-700/30 bg-gold-500/5">DEMO MODE</span>
        Using synthetic transaction data and mocked Razorpay responses. Configure credentials in Settings to enable Razorpay Test Mode.
      </motion.div>
    </div>
  );
}
