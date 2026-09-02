import { Transaction } from '../types';

export function computeDashboard(transactions: Transaction[]) {
  const total = transactions.length;
  const revenueAtRisk = transactions
    .filter((t) => !['recovered'].includes(t.status))
    .reduce((sum, t) => sum + t.amount, 0);
  const recoveredRevenue = transactions
    .filter((t) => t.status === 'recovered')
    .reduce((sum, t) => sum + t.amount, 0);
  const failedRevenue = transactions
    .filter((t) => t.status === 'stopped')
    .reduce((sum, t) => sum + t.amount, 0);

  const recoveredCount = transactions.filter((t) => t.status === 'recovered').length;
  const escalatedCount = transactions.filter((t) => t.status === 'escalated').length;
  const stoppedCount = transactions.filter((t) => t.status === 'stopped').length;
  const activeCount = transactions.filter((t) => ['ready', 'pending', 'in_progress'].includes(t.status)).length;

  const recoveryRate = total > 0 ? (recoveredCount / total) * 100 : 0;
  const avgProbability =
    total > 0 ? transactions.reduce((sum, t) => sum + t.recoveryProbability, 0) / total : 0;
  const largestRecovered = transactions
    .filter((t) => t.status === 'recovered')
    .reduce((max, t) => Math.max(max, t.amount), 0);

  return {
    revenueAtRisk: Math.round(revenueAtRisk),
    recoveredRevenue: Math.round(recoveredRevenue),
    failedRevenue: Math.round(failedRevenue),
    recoveryRate: Math.round(recoveryRate * 10) / 10,
    activeRecoveries: activeCount,
    transactionsAnalyzed: total,
    escalated: escalatedCount,
    stopped: stoppedCount,
    averageRecoveryProbability: Math.round(avgProbability),
    largestRecoveredTransaction: largestRecovered,
  };
}

export function computeTimeSeries(transactions: Transaction[], days: number) {
  const buckets: { date: string; revenueAtRisk: number; recovered: number; failed: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    buckets.push({ date: dateStr, revenueAtRisk: 0, recovered: 0, failed: 0 });
  }
  const bucketIndex = new Map(buckets.map((b, i) => [b.date, i]));

  for (const t of transactions) {
    const dateStr = t.createdAt.slice(0, 10);
    const idx = bucketIndex.get(dateStr);
    if (idx === undefined) continue;
    if (t.status === 'recovered') buckets[idx].recovered += t.amount;
    else if (t.status === 'stopped') buckets[idx].failed += t.amount;
    else buckets[idx].revenueAtRisk += t.amount;
  }
  return buckets;
}

export function computeFailureDistribution(transactions: Transaction[]) {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    map[t.failureReason] = (map[t.failureReason] || 0) + 1;
  }
  return Object.entries(map).map(([reason, count]) => ({ reason, count }));
}

export function computeActionPerformance(transactions: Transaction[]) {
  const map: Record<string, { total: number; recovered: number }> = {};
  for (const t of transactions) {
    if (!map[t.recommendedAction]) map[t.recommendedAction] = { total: 0, recovered: 0 };
    map[t.recommendedAction].total += 1;
    if (t.status === 'recovered') map[t.recommendedAction].recovered += 1;
  }
  return Object.entries(map).map(([action, v]) => ({
    action,
    total: v.total,
    recovered: v.recovered,
    successRate: v.total > 0 ? Math.round((v.recovered / v.total) * 100) : 0,
  }));
}

export function computeProbabilityDistribution(transactions: Transaction[]) {
  const buckets = [
    { range: '0-20%', min: 0, max: 20, count: 0 },
    { range: '20-40%', min: 20, max: 40, count: 0 },
    { range: '40-60%', min: 40, max: 60, count: 0 },
    { range: '60-80%', min: 60, max: 80, count: 0 },
    { range: '80-100%', min: 80, max: 101, count: 0 },
  ];
  for (const t of transactions) {
    const b = buckets.find((b) => t.recoveryProbability >= b.min && t.recoveryProbability < b.max);
    if (b) b.count += 1;
  }
  return buckets.map(({ range, count }) => ({ range, count }));
}

export function computeCustomerSegmentRecovery(transactions: Transaction[]) {
  const segments = [
    { label: 'High Value (>₹20k)', min: 20000, max: Infinity },
    { label: 'Mid Value (₹5k-20k)', min: 5000, max: 20000 },
    { label: 'Low Value (<₹5k)', min: 0, max: 5000 },
  ];
  return segments.map((seg) => {
    const inSeg = transactions.filter((t) => t.customerValue >= seg.min && t.customerValue < seg.max);
    const recovered = inSeg.filter((t) => t.status === 'recovered').length;
    return {
      segment: seg.label,
      total: inSeg.length,
      recovered,
      rate: inSeg.length > 0 ? Math.round((recovered / inSeg.length) * 100) : 0,
    };
  });
}
