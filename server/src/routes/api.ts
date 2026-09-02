import { Router, Request, Response } from 'express';
import { store } from '../data/store';
import {
  computeActionPerformance,
  computeCustomerSegmentRecovery,
  computeDashboard,
  computeFailureDistribution,
  computeProbabilityDistribution,
  computeTimeSeries,
} from '../services/analytics';
import { executeRecovery, pauseRecovery, escalateRecovery, runSimulationBatch } from '../services/recoveryService';
import { isTestModeConfigured } from '../services/razorpayService';
import { currentProvider } from '../services/aiService';
import { ACTION_LABELS, ACTION_META } from '../agents/recoveryAgent';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', mode: isTestModeConfigured ? 'razorpay_test' : 'demo', aiProvider: currentProvider(), time: new Date().toISOString() });
});

router.get('/dashboard', (_req, res) => {
  const dashboard = computeDashboard(store.transactions);
  const range = Number(_req.query.days) || 30;
  const timeSeries = computeTimeSeries(store.transactions, range);
  res.json({ ...dashboard, timeSeries, mode: isTestModeConfigured ? 'razorpay_test' : 'demo' });
});

router.get('/transactions', (req: Request, res: Response) => {
  const { status, search, filter } = req.query as { status?: string; search?: string; filter?: string };
  let results = [...store.transactions];

  if (filter && filter !== 'all') {
    if (filter === 'high_value') results = results.filter((t) => t.amount > store.settings.highValueThreshold);
    else if (filter === 'high_probability') results = results.filter((t) => t.recoveryProbability >= 70);
    else if (filter === 'needs_review') results = results.filter((t) => t.status === 'pending' || t.status === 'escalated');
    else results = results.filter((t) => t.status === filter);
  }
  if (status) results = results.filter((t) => t.status === status);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((t) => t.customerName.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }

  results.sort((a, b) => b.expectedRecoveryValue - a.expectedRecoveryValue);
  res.json({ transactions: results, total: results.length });
});

router.get('/transactions/:id', (req, res) => {
  const txn = store.getTransaction(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  res.json({
    transaction: txn,
    actionMeta: ACTION_META[txn.recommendedAction],
    actionLabel: ACTION_LABELS[txn.recommendedAction],
  });
});

router.post('/agent/run', async (req, res) => {
  const { transactionId } = req.body as { transactionId?: string };
  if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });
  try {
    const result = await executeRecovery(transactionId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Agent run failed' });
  }
});

router.post('/recovery/simulate', async (req, res) => {
  const {
    batchSize = 50,
    failureMix = [],
    maxRetries = store.settings.maxRetries,
    minRecoveryProbability = store.settings.minRecoveryProbability,
    maxContacts = store.settings.maxContacts,
    highValueThreshold = store.settings.highValueThreshold,
  } = req.body || {};

  try {
    const results = await runSimulationBatch({
      batchSize: Number(batchSize),
      failureMix,
      maxRetries: Number(maxRetries),
      minRecoveryProbability: Number(minRecoveryProbability),
      maxContacts: Number(maxContacts),
      highValueThreshold: Number(highValueThreshold),
    });

    const processed = results.map((r) => r.transaction);
    const recovered = results.filter((r) => r.outcome === 'recovered');
    const escalated = results.filter((r) => r.outcome === 'escalated');
    const stopped = results.filter((r) => r.outcome === 'stopped');
    const revenueAtRisk = processed.reduce((sum, t) => sum + t.amount, 0);
    const recoveredRevenue = recovered.reduce((sum, r) => sum + r.transaction.amount, 0);
    const avgProbability = processed.length
      ? Math.round(processed.reduce((s, t) => s + t.recoveryProbability, 0) / processed.length)
      : 0;

    res.json({
      results,
      summary: {
        processed: processed.length,
        revenueAtRisk,
        recoveredRevenue,
        recoveryRate: processed.length ? Math.round((recovered.length / processed.length) * 1000) / 10 : 0,
        escalated: escalated.length,
        stopped: stopped.length,
        averageRecoveryProbability: avgProbability,
        averageRecoveryTimeMinutes: 18,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Simulation failed' });
  }
});

router.post('/recovery/:id/execute', async (req, res) => {
  try {
    const result = await executeRecovery(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Execution failed' });
  }
});

router.post('/recovery/:id/pause', (req, res) => {
  try {
    const txn = pauseRecovery(req.params.id);
    res.json({ ok: true, transaction: txn });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Pause failed' });
  }
});

router.post('/recovery/:id/escalate', (req, res) => {
  try {
    const txn = escalateRecovery(req.params.id, req.body?.reason);
    res.json({ ok: true, transaction: txn });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Escalation failed' });
  }
});

router.post('/recovery/:id/simulate-failure', (req, res) => {
  const txn = store.getTransaction(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  const { scenario } = req.body as { scenario: string };

  const scenarios: Record<string, { message: string; policy: string; next: string }> = {
    api_unavailable: {
      message: 'Payment API unavailable. Razorpay gateway did not respond within timeout.',
      policy: 'Fail-safe: no action taken when downstream API is unreachable.',
      next: 'Retry automatically once gateway health check passes.',
    },
    duplicate_request: {
      message: 'Duplicate recovery request detected within cooldown window.',
      policy: 'No duplicate action policy.',
      next: 'Wait until cooldown window elapses before retrying.',
    },
    retry_limit: {
      message: `Retry limit exceeded. Maximum retries: ${txn.maxRetries}. Current retries: ${txn.retryCount}.`,
      policy: 'Maximum retry attempts policy.',
      next: 'Escalate to merchant operations.',
    },
    contact_limit: {
      message: `Customer contact limit exceeded. Maximum contacts: ${txn.maxContacts}.`,
      policy: 'Maximum contact attempts policy.',
      next: 'Escalate to merchant operations.',
    },
    unknown_state: {
      message: 'Payment state could not be verified with the gateway.',
      policy: 'Unknown state escalation policy.',
      next: 'Escalate for manual verification.',
    },
  };

  const s = scenarios[scenario] || scenarios.api_unavailable;
  store.addAudit({
    id: `audit_${txn.id}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    transactionId: txn.id,
    event: `ACTION BLOCKED — ${s.message}`,
    decision: s.next,
    policy: s.policy,
    actor: 'system',
    result: 'blocked',
  });

  res.json({ blocked: true, message: s.message, policy: s.policy, nextStep: s.next });
});

router.get('/audit', (req, res) => {
  const { filter } = req.query as { filter?: string };
  let events = [...store.globalAudit].reverse();
  if (filter && filter !== 'all') {
    if (filter === 'decisions') events = events.filter((e) => !!e.decision && e.result === 'info');
    else if (filter === 'actions') events = events.filter((e) => e.result === 'success');
    else if (filter === 'escalations') events = events.filter((e) => e.result === 'escalated');
    else if (filter === 'exceptions') events = events.filter((e) => e.result === 'blocked' || e.result === 'stopped');
    else if (filter === 'blocked') events = events.filter((e) => e.result === 'blocked');
  }
  res.json({ events: events.slice(0, 300), total: events.length });
});

router.get('/analytics', (req, res) => {
  const days = Number(req.query.days) || 30;
  res.json({
    dashboard: computeDashboard(store.transactions),
    timeSeries: computeTimeSeries(store.transactions, days),
    failureDistribution: computeFailureDistribution(store.transactions),
    actionPerformance: computeActionPerformance(store.transactions),
    probabilityDistribution: computeProbabilityDistribution(store.transactions),
    customerSegments: computeCustomerSegmentRecovery(store.transactions),
  });
});

router.get('/settings', (_req, res) => {
  const s = store.settings;
  res.json({
    ...s,
    razorpaySecretMasked: process.env.RAZORPAY_KEY_SECRET ? '••••••••••••' : '',
    aiKeyMasked: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY ? '••••••••••••' : '',
    razorpayMode: isTestModeConfigured ? 'test' : 'demo',
  });
});

router.post('/settings', (req, res) => {
  const body = req.body || {};
  const allowedKeys: (keyof typeof store.settings)[] = [
    'maxRetries',
    'maxContacts',
    'minRecoveryProbability',
    'highValueThreshold',
    'cooldownMinutes',
    'autonomousMode',
    'requireApprovalHighValue',
    'auditLogging',
    'demoMode',
  ];
  for (const key of allowedKeys) {
    if (key in body) (store.settings as any)[key] = body[key];
  }
  res.json({ ok: true, settings: store.settings });
});

router.post('/reset', (_req, res) => {
  store.reset();
  res.json({ ok: true });
});
