import { motion } from 'framer-motion';
import { Eye, Stethoscope, Brain, ShieldCheck, Zap, CheckCircle, ArrowUpCircle, OctagonX } from 'lucide-react';
import { cn } from '../lib/format';

const STAGES = [
  { key: 'observe', label: 'OBSERVE', icon: Eye },
  { key: 'diagnose', label: 'DIAGNOSE', icon: Stethoscope },
  { key: 'decide', label: 'DECIDE', icon: Brain },
  { key: 'policy', label: 'POLICY CHECK', icon: ShieldCheck },
  { key: 'act', label: 'ACT', icon: Zap },
  { key: 'verify', label: 'VERIFY', icon: CheckCircle },
  { key: 'final', label: 'STOP / ESCALATE', icon: ArrowUpCircle },
];

export function AgentPipeline({ activeIndex, outcome }: { activeIndex: number; outcome?: 'recovered' | 'escalated' | 'stopped' | null }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-1">
      {STAGES.map((stage, i) => {
        const isActive = i === activeIndex;
        const isDone = i < activeIndex || (i === STAGES.length - 1 && outcome);
        const Icon = stage.key === 'final' && outcome === 'stopped' ? OctagonX : stage.icon;

        return (
          <div key={stage.key} className="flex-1 flex sm:flex-col items-center gap-2 sm:gap-1.5">
            <motion.div
              animate={isActive ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: isActive ? Infinity : 0, duration: 1.2 }}
              className={cn(
                'w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border transition-colors duration-300',
                isActive
                  ? 'bg-gold-500/15 border-gold-500 text-gold-400 shadow-glow'
                  : isDone
                  ? 'bg-emerald-500/10 border-emerald-700/40 text-emerald-400'
                  : 'bg-base-800/60 border-base-700/60 text-cream-400/50'
              )}
            >
              <Icon size={17} />
            </motion.div>
            <span
              className={cn(
                'text-[10px] font-semibold tracking-wide text-center',
                isActive ? 'text-gold-400' : isDone ? 'text-emerald-400' : 'text-cream-400/50'
              )}
            >
              {stage.label}
            </span>
            {i < STAGES.length - 1 && <div className="hidden sm:block flex-1 h-px bg-base-700/60 mt-5" />}
          </div>
        );
      })}
    </div>
  );
}
