import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../services/api';
import { formatINR, formatDate, FAILURE_LABELS, ACTION_LABELS, cn } from '../lib/format';

const RANGES = [{ label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }];
const COLORS = ['#d99a45', '#34d399', '#f87171', '#60a5fa', '#c084fc'];

export default function Analytics() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .analytics(range)
      .then(setData)
      .catch(() => toast.error('Could not load analytics.'))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="h-8 w-64 shimmer rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="panel p-5 h-24 shimmer" />)}
        </div>
      </div>
    );
  }

  const { dashboard, timeSeries, failureDistribution, actionPerformance, probabilityDistribution, customerSegments } = data;

  const kpis = [
    { label: 'Gross Revenue at Risk', value: formatINR(dashboard.revenueAtRisk) },
    { label: 'Recovered Revenue', value: formatINR(dashboard.recoveredRevenue) },
    { label: 'Recovery Uplift', value: `${dashboard.recoveryRate}%` },
    { label: 'Average Recovery Time', value: '18m' },
    { label: 'Best Intervention', value: 'Payment Link' },
    { label: 'Largest Recovery', value: formatINR(dashboard.largestRecoveredTransaction) },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-cream-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-cream-400 mt-1">Deep visibility into recovery performance.</p>
        </div>
        <div className="flex items-center gap-1 bg-base-800/60 rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={cn('text-xs font-medium px-3 py-1.5 rounded-md transition-colors', range === r.days ? 'bg-gold-500 text-base-950' : 'text-cream-400 hover:text-cream-100')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="panel p-5">
            <p className="text-xs text-cream-400 uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-xl font-semibold text-cream-100 mono">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-cream-100 mb-4">Recovery Rate Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeries.map((t: any) => ({ ...t, rate: t.revenueAtRisk + t.recovered > 0 ? Math.round((t.recovered / (t.revenueAtRisk + t.recovered + t.failed)) * 100) : 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242019" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} labelFormatter={formatDate} />
              <Line type="monotone" dataKey="rate" name="Recovery Rate" stroke="#d99a45" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-cream-100 mb-4">Failure Reasons</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={failureDistribution.map((f: any) => ({ name: FAILURE_LABELS[f.reason], value: f.count }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {failureDistribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: '#b8ab91' }} />
              <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-cream-100 mb-4">Recovery Probability Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={probabilityDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242019" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="count" fill="#d99a45" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-cream-100 mb-4">Recovery Action Performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={actionPerformance.map((a: any) => ({ ...a, action: ACTION_LABELS[a.action] || a.action }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#242019" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="action" type="category" width={130} tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="successRate" name="Success Rate %" fill="#34d399" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-cream-100 mb-4">Customer Segment Recovery</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={customerSegments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242019" vertical={false} />
              <XAxis dataKey="segment" tick={{ fill: '#b8ab91', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#b8ab91', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="rate" name="Recovery Rate %" fill="#e8b364" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
