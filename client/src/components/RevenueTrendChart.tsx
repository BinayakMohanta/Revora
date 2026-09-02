import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDate, formatINRFull } from '../lib/format';

interface Point {
  date: string;
  revenueAtRisk: number;
  recovered: number;
  failed: number;
}

export function RevenueTrendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d99a45" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#d99a45" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#242019" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#4a4133"
          tick={{ fill: '#b8ab91', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#4a4133"
          tick={{ fill: '#b8ab91', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#141310', border: '1px solid #242019', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: '#f0e9dc' }}
          formatter={(v: number) => formatINRFull(v)}
          labelFormatter={formatDate}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#b8ab91' }} />
        <Area type="monotone" dataKey="revenueAtRisk" name="Revenue at Risk" stroke="#d99a45" fill="url(#riskGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="recovered" name="Recovered Revenue" stroke="#34d399" fill="url(#recoveredGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="failed" name="Failed Revenue" stroke="#f87171" fill="url(#failedGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
