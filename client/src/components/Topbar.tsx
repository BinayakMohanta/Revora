import { useState } from 'react';
import { Menu, Search, Bell, ChevronDown, Calendar } from 'lucide-react';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 border-b border-base-700/60 bg-base-950/80 backdrop-blur-xl">
      <button onClick={onMenuClick} className="lg:hidden text-cream-300 hover:text-cream-100">
        <Menu size={20} />
      </button>

      <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400" />
          <input
            placeholder="Search transactions, customers..."
            className="w-full bg-base-800/60 border border-base-700/60 rounded-lg pl-9 pr-3 py-2 text-sm text-cream-100 placeholder:text-cream-400/60 focus:outline-none focus:border-gold-700/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 sm:flex-none" />

      <button className="hidden md:flex items-center gap-2 text-sm text-cream-300 border border-base-700/60 rounded-lg px-3 py-2 hover:border-base-600 transition-colors">
        <Calendar size={14} />
        Last 30 days
        <ChevronDown size={13} />
      </button>

      <button className="hidden md:flex items-center gap-2 text-sm text-cream-300 border border-base-700/60 rounded-lg px-3 py-2 hover:border-base-600 transition-colors">
        Acme Retail Pvt Ltd
        <ChevronDown size={13} />
      </button>

      <div className="relative">
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-base-700/60 text-cream-300 hover:border-base-600 transition-colors"
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold-400" />
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-72 panel-solid p-3 shadow-panel">
            <p className="text-xs font-semibold text-cream-400 uppercase tracking-wide mb-2">Recent Activity</p>
            <div className="space-y-2 text-sm">
              <p className="text-cream-200">Payment recovered for TXN_10291 — ₹4,999</p>
              <p className="text-cream-400 text-xs">2 minutes ago</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-700 flex items-center justify-center text-xs font-semibold text-base-950">
        RM
      </div>
    </header>
  );
}
