import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, CheckCircle2, XCircle, PauseCircle, ArrowUpRight, ScrollText } from 'lucide-react';
import { api } from '../services/api';
import { formatINRFull, formatDateTime, ACTION_LABELS, FAILURE_LABELS, cn } from '../lib/format';
import { StatusPill, RiskPill } from './StatusPill';
import { Transaction } from '../types';

const TIMELINE_STEPS = [
  'Payment attempted',
  'Bank declined',
  'Failure detected',
  'AI diagnosis',
  'Recovery action selected',
  'Payment link generated',
  'Customer completed payment',
  'Revenue recovered',
];

export function TransactionDrawer({
  transaction,
  onClose,
  onUpdated,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onUpdated: (t: Transaction) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  if (!transaction) return null;
  const t = transaction;
  const recovered = t.status === 'recovered';

  async function run(action: 'execute' | 'pause' | 'escalate') {
    setBusy(action);
    try {
      let res;
      if (action === 'execute') res = await api.execute(t.id);
      if (action === 'pause') res = await api.pause(t.id);
      if (action === 'escalate') res = await api.escalate(t.id, 'Manually escalated by merchant from transaction detail.');
      if (res?.transaction) {
        onUpdated(res.transaction);
        if (action === 'execute') {
          toast[res.ok && !res.blocked ? 'success' : 'error'](res.message || 'Action complete');
        } else {
          toast.success(`Transaction ${action === 'pause' ? 'paused' : 'escalated'}`);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const stepIndex = recovered ? TIMELINE_STEPS.length - 1 : t.status === 'in_progress' || t.status === 'pending' ? 5 : t.status === 'ready' ? 4 : 3;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/60 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-screen w-full sm:w-[480px] bg-base-900 border-l border-base-700/60 z-50 overflow-y-auto scrollbar-thin"
      >
        <div className="sticky top-0 bg-base-900/95 backdrop-blur-xl border-b border-base-700/60 p-5 flex items-center justify-between z-10">
          <div>
            <p className="text-xs text-cream-400 mono">{t.id}</p>
            <div className="mt-1"><StatusPill status={t.status} /></div>
          </div>
          <button onClick={onClose} className="text-cream-400 hover:text-cream-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-cream-400 mb-1">Amount</p>
              <p className="text-xl font-semibold text-cream-100 mono">{formatINRFull(t.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-cream-400 mb-1">Customer</p>
              <p className="text-sm font-medium text-cream-100">{t.customerName}</p>
              <p className="text-xs text-cream-400">{t.customerEmail}</p>
            </div>
          </div>

          <div className="panel-solid p-4">
            <p className="text-xs font-semibold text-gold-400 uppercase tracking-wide mb-2">AI Diagnosis</p>
            <p className="text-sm text-cream-100 mb-3">"{t.diagnosis}"</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-semibold text-cream-100 mono">{t.confidence}%</p>
                <p className="text-[11px] text-cream-400">Confidence</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gold-400 mono">{t.recoveryProbability}%</p>
                <p className="text-[11px] text-cream-400">Recovery Prob.</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-400 mono">{formatINRFull(t.expectedRecoveryValue)}</p>
                <p className="text-[11px] text-cream-400">Expected Value</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-cream-400 uppercase tracking-wide mb-2">Recommended Action</p>
            <div className="flex items-center gap-2">
              <span className="tag border-gold-700/30 bg-gold-500/5 text-gold-400">{ACTION_LABELS[t.recommendedAction]}</span>
              <RiskPill risk={t.actionRisk} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-cream-400 uppercase tracking-wide mb-2">Reasoning / Evidence</p>
            <ul className="space-y-1.5">
              {t.reasoning.map((r, i) => (
                <li key={i} className="text-sm text-cream-300 flex items-start gap-2">
                  <span className="text-gold-500 mt-1">–</span> {r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-cream-400 uppercase tracking-wide mb-2">Safety Checks</p>
            <ul className="space-y-1.5">
              {t.policyChecks.map((c, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  {c.passed ? (
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span className={c.passed ? 'text-cream-300' : 'text-red-300'}>{c.label}</span>
                </li>
              ))}
            </ul>
            {t.escalationReason && (
              <div className="mt-3 p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300">
                {t.escalationReason}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-cream-400 uppercase tracking-wide mb-3">Timeline</p>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn('w-2 h-2 rounded-full', i <= stepIndex ? 'bg-gold-400' : 'bg-base-600')} />
                    {i < TIMELINE_STEPS.length - 1 && <span className={cn('w-px h-6', i < stepIndex ? 'bg-gold-400/50' : 'bg-base-700')} />}
                  </div>
                  <span className={cn('text-xs pb-4', i <= stepIndex ? 'text-cream-200' : 'text-cream-400/50')}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-cream-400 mb-3">Created {formatDateTime(t.createdAt)}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => run('execute')}
                disabled={busy !== null || recovered}
                className="flex items-center justify-center gap-1.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-base-950 text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                <CheckCircle2 size={14} /> Execute Recovery
              </button>
              <button
                onClick={() => run('pause')}
                disabled={busy !== null || recovered}
                className="flex items-center justify-center gap-1.5 border border-base-600 hover:border-base-500 disabled:opacity-50 text-cream-200 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                <PauseCircle size={14} /> Pause
              </button>
              <button
                onClick={() => run('escalate')}
                disabled={busy !== null || recovered}
                className="flex items-center justify-center gap-1.5 border border-amber-800/40 hover:border-amber-700 disabled:opacity-50 text-amber-300 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                <ArrowUpRight size={14} /> Escalate
              </button>
              <button
                onClick={() => setShowAudit((v) => !v)}
                className="flex items-center justify-center gap-1.5 border border-base-600 hover:border-base-500 text-cream-200 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                <ScrollText size={14} /> Audit Trail
              </button>
            </div>
          </div>

          {showAudit && (
            <div className="panel-solid p-4 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {t.auditEvents
                .slice()
                .reverse()
                .map((e) => (
                  <div key={e.id} className="text-xs border-b border-base-700/40 pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-cream-200">{e.event}</span>
                      <span className="text-cream-400 mono">{formatDateTime(e.timestamp)}</span>
                    </div>
                    {e.decision && <p className="text-cream-400 mt-0.5">{e.decision}</p>}
                  </div>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
