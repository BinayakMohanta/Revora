import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Receipt,
  Bot,
  FlaskConical,
  BarChart3,
  ScrollText,
  Network,
  Settings,
  CircleDot,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { cn } from '../lib/format';

const NAV_ITEMS = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/queue', label: 'Recovery Queue', icon: ListChecks },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/agent', label: 'Recovery Agent', icon: Bot },
  { to: '/lab', label: 'Recovery Lab', icon: FlaskConical },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/audit', label: 'Audit Trail', icon: ScrollText },
  { to: '/architecture', label: 'Architecture', icon: Network },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 bg-base-900 border-r border-base-700/60 z-50 flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-base-700/60">
          <Logo />
          <button onClick={onClose} className="lg:hidden text-cream-400 hover:text-cream-100">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors',
                  isActive
                    ? 'bg-gold-500/10 text-gold-400 border border-gold-700/25'
                    : 'text-cream-300 hover:text-cream-100 hover:bg-base-800/60 border border-transparent'
                )
              }
            >
              <item.icon size={16} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-base-700/60 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="tag text-gold-400 border-gold-700/30 bg-gold-500/5">
              <CircleDot size={10} />
              DEMO MODE
            </span>
          </div>
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
            <span className="text-xs text-cream-400">System operational</span>
          </div>
        </div>
      </aside>
    </>
  );
}
