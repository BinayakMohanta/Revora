import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/format';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: boolean;
  delay?: number;
}

export function KpiCard({ label, value, icon: Icon, trend, trendUp, accent, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'panel p-5 flex flex-col gap-3 hover:border-gold-700/30 transition-colors duration-300',
        accent && 'border-gold-700/25'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-cream-400 uppercase tracking-wide">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', accent ? 'bg-gold-500/10' : 'bg-base-700/50')}>
          <Icon size={15} className={accent ? 'text-gold-400' : 'text-cream-400'} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-cream-100 mono">{value}</span>
        {trend && (
          <span className={cn('text-xs font-medium mb-0.5', trendUp ? 'text-emerald-400' : 'text-red-400')}>
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}
