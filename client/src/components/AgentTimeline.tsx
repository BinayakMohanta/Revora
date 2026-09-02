import { motion } from 'framer-motion';
import { formatTime } from '../lib/format';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  event: string;
  meta?: string;
  result: string;
}

const RESULT_DOT: Record<string, string> = {
  success: 'bg-emerald-400',
  recovered: 'bg-emerald-400',
  blocked: 'bg-red-400',
  stopped: 'bg-red-400',
  escalated: 'bg-amber-400',
  info: 'bg-gold-400',
};

export function AgentTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-cream-400 py-8 text-center">No activity yet. Run a recovery simulation to populate the timeline.</p>;
  }

  return (
    <div className="space-y-0 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
      {events.map((e, i) => (
        <motion.div
          key={e.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
          className="flex gap-3 py-2.5 border-b border-base-700/40 last:border-0"
        >
          <div className="flex flex-col items-center pt-1">
            <span className={`w-2 h-2 rounded-full ${RESULT_DOT[e.result] || 'bg-cream-400'}`} />
            <span className="w-px flex-1 bg-base-700/60 mt-1" />
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-cream-100 leading-snug">{e.event}</p>
              <span className="text-[11px] text-cream-400 mono shrink-0">{formatTime(e.timestamp)}</span>
            </div>
            {e.meta && <p className="text-xs text-cream-400 mt-0.5">{e.meta}</p>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
