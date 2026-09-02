import { motion } from 'framer-motion';
import { Network, ShieldAlert, UserCheck, ScrollText } from 'lucide-react';

const FLOW = [
  { label: 'MERCHANT', desc: 'Payment platform sends transaction & customer events.' },
  { label: 'PAYMENT EVENTS', desc: 'Successes, failures, and retries streamed in real time.' },
  { label: 'REVENUE RISK DETECTOR', desc: 'Flags failed / at-risk revenue for analysis.' },
  { label: 'AI DIAGNOSIS', desc: 'Deterministic agent classifies failure & estimates recovery probability.' },
  { label: 'RECOVERY POLICY ENGINE', desc: 'Evaluates merchant-defined safety boundaries.' },
  { label: 'ACTION EXECUTOR', desc: 'Executes the bounded recovery action.' },
  { label: 'RAZORPAY TEST APIs', desc: 'Payment Links, Orders, Payments — Test Mode or Demo Mode.' },
  { label: 'VERIFICATION', desc: 'Confirms payment status post-action.' },
  { label: 'AUDIT TRAIL', desc: 'Immutable record of every decision & action.' },
];

const BOUNDARIES = [
  { icon: ShieldAlert, title: 'Safety Boundaries', desc: 'Max retries, max contacts, high-value approval, cooldown windows — all merchant-configurable.' },
  { icon: Network, title: 'Stopping Rules', desc: 'Agent halts automatically when probability is too low, limits are hit, or state is unknown.' },
  { icon: UserCheck, title: 'Human Escalation', desc: 'Anything outside safe bounds is routed to merchant operations, never silently retried.' },
];

export default function Architecture() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-cream-100 tracking-tight flex items-center gap-2">
          <Network size={22} className="text-gold-400" /> Architecture
        </h1>
        <p className="text-sm text-cream-400 mt-1">How Revora observes, decides, and acts — safely.</p>
      </div>

      <div className="panel p-6 sm:p-8">
        <div className="flex flex-col items-center gap-0">
          {FLOW.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="w-full max-w-xl"
            >
              <div className="panel-solid px-5 py-4 flex flex-col items-center text-center hover:border-gold-700/30 transition-colors">
                <span className="text-sm font-semibold tracking-wide text-gold-400">{step.label}</span>
                <span className="text-xs text-cream-400 mt-1">{step.desc}</span>
              </div>
              {i < FLOW.length - 1 && (
                <div className="flex justify-center py-1.5">
                  <div className="w-px h-6 bg-gradient-to-b from-gold-500/50 to-transparent" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BOUNDARIES.map((b) => (
          <div key={b.title} className="panel p-5">
            <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center mb-3">
              <b.icon size={16} className="text-gold-400" />
            </div>
            <h3 className="text-sm font-semibold text-cream-100 mb-1">{b.title}</h3>
            <p className="text-xs text-cream-400 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>

      <div className="panel p-5 flex items-center gap-3">
        <ScrollText size={16} className="text-gold-400 shrink-0" />
        <p className="text-xs text-cream-400">
          Every stage of this pipeline emits an audit event — see the <span className="text-cream-200">Audit Trail</span> page for the complete, timestamped decision log.
        </p>
      </div>
    </div>
  );
}
