import { createSeededRandom, pick, randInt, randFloat } from '../utils/seededRandom';
import { analyzeTransaction, ACTION_META } from '../agents/recoveryAgent';
import { evaluatePolicy } from '../services/policyEngine';
import { FailureReason, RecoveryPolicySettings, Transaction, AuditEvent } from '../types';

const FIRST_NAMES = [
  'Aditi', 'Rahul', 'Meera', 'Arjun', 'Priya', 'Vikram', 'Ananya', 'Karan',
  'Sneha', 'Rohit', 'Kavya', 'Aditya', 'Divya', 'Nikhil', 'Pooja', 'Siddharth',
  'Ishaan', 'Neha', 'Aryan', 'Riya', 'Varun', 'Sanya', 'Aarav', 'Tanvi',
  'Manish', 'Shreya', 'Kabir', 'Nisha', 'Yash', 'Ritu', 'Dev', 'Kritika',
  'Amit', 'Simran', 'Rajat', 'Anjali', 'Harsh', 'Payal', 'Suresh', 'Namrata',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Kapoor', 'Malhotra', 'Iyer', 'Reddy', 'Gupta', 'Nair',
  'Menon', 'Chawla', 'Bose', 'Rao', 'Joshi', 'Desai', 'Pillai', 'Agarwal',
  'Bhatt', 'Chopra', 'Saxena', 'Mehta', 'Kulkarni', 'Trivedi', 'Sinha', 'Dutta',
];

const FAILURE_REASONS: FailureReason[] = [
  'bank_decline', 'insufficient_funds', 'expired_card', 'checkout_abandonment', 'subscription_failure',
];

const FAILURE_CODES: Record<FailureReason, string[]> = {
  bank_decline: ['BANK_DECLINED', 'ISSUER_DECLINE', 'GENERIC_DECLINE'],
  insufficient_funds: ['INSUFFICIENT_FUNDS'],
  expired_card: ['CARD_EXPIRED'],
  checkout_abandonment: ['CHECKOUT_TIMEOUT', 'USER_DROPPED'],
  subscription_failure: ['MANDATE_FAILED', 'AUTO_DEBIT_FAILED'],
};

let auditCounter = 0;
function makeAuditEvent(txnId: string, minutesAgo: number, event: string, opts: Partial<AuditEvent> = {}): AuditEvent {
  auditCounter += 1;
  const ts = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  return {
    id: `audit_${txnId}_${auditCounter}`,
    timestamp: ts,
    transactionId: txnId,
    event,
    actor: 'agent',
    result: 'info',
    ...opts,
  };
}

export function generateTransactions(count = 100, seed = 42, policy?: RecoveryPolicySettings): Transaction[] {
  const rng = createSeededRandom(seed);
  const defaultPolicy: RecoveryPolicySettings = policy || {
    maxRetries: 2,
    maxContacts: 2,
    minRecoveryProbability: 50,
    highValueThreshold: 25000,
    cooldownMinutes: 30,
    autonomousMode: true,
    requireApprovalHighValue: true,
    auditLogging: true,
    demoMode: true,
  };

  const transactions: Transaction[] = [];

  for (let i = 0; i < count; i++) {
    const id = `TXN_${10291 + i}`;
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const customerName = `${first} ${last}`;
    const customerEmail = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;

    const failureReason = pick(rng, FAILURE_REASONS);
    const failureCode = pick(rng, FAILURE_CODES[failureReason]);

    // Amount distribution: mostly mid-range, occasional high-value.
    const isHighRoll = rng() < 0.12;
    const amount = isHighRoll
      ? Math.round(randFloat(rng, 15000, 49999))
      : Math.round(randFloat(rng, 499, 14999));

    const previousSuccessfulPayments = rng() < 0.3 ? 0 : randInt(rng, 1, 6);
    const previousFailures = rng() < 0.5 ? randInt(rng, 0, 1) : randInt(rng, 2, 4);
    const customerValue = Math.round(amount * (1 + previousSuccessfulPayments * randFloat(rng, 0.6, 1.4)));

    const retryCount = rng() < 0.6 ? 0 : randInt(rng, 0, 2);
    const contactCount = rng() < 0.7 ? 0 : randInt(rng, 0, 2);

    const daysAgo = randFloat(rng, 0.1, 6);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const lastSuccessfulPayment =
      previousSuccessfulPayments > 0
        ? new Date(Date.now() - randFloat(rng, 7, 90) * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const analysis = analyzeTransaction({
      amount,
      failureReason,
      customerValue,
      previousSuccessfulPayments,
      previousFailures,
      retryCount,
      contactCount,
      highValueThreshold: defaultPolicy.highValueThreshold,
    });

    const actionMeta = ACTION_META[analysis.recommendedAction];

    const txn: Transaction = {
      id,
      customerName,
      customerEmail,
      amount,
      currency: 'INR',
      createdAt,
      status: 'failed',
      failureReason,
      failureCode,
      customerValue,
      previousSuccessfulPayments,
      previousFailures,
      lastSuccessfulPayment,
      recoveryProbability: analysis.recoveryProbability,
      expectedRecoveryValue: analysis.expectedRecoveryValue,
      recommendedAction: analysis.recommendedAction,
      actionRisk: analysis.riskLevel,
      retryCount,
      maxRetries: defaultPolicy.maxRetries,
      contactCount,
      maxContacts: defaultPolicy.maxContacts,
      nextActionAt: null,
      escalationReason: null,
      diagnosis: analysis.diagnosis,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      policyChecks: [],
      auditEvents: [],
      recoveredAt: null,
    };

    // Evaluate policy to set initial status realistically.
    const decision = evaluatePolicy(txn, defaultPolicy);
    txn.policyChecks = decision.checks;

    const minutesAgo = daysAgo * 24 * 60;
    const events: AuditEvent[] = [
      makeAuditEvent(id, minutesAgo, 'Payment failure detected', { result: 'info' }),
      makeAuditEvent(id, minutesAgo - 0.02, 'Revenue risk identified', { result: 'info' }),
      makeAuditEvent(id, minutesAgo - 0.03, 'Customer history analyzed', { result: 'info' }),
      makeAuditEvent(id, minutesAgo - 0.05, `Diagnosis: ${analysis.diagnosis}`, { decision: 'diagnosis', result: 'info' }),
      makeAuditEvent(id, minutesAgo - 0.06, `Recovery probability: ${analysis.recoveryProbability}%`, { result: 'info' }),
    ];

    if (decision.outcome === 'allow') {
      events.push(
        makeAuditEvent(id, minutesAgo - 0.08, 'Policy check: PASSED', {
          decision: actionMeta.reason,
          policy: actionMeta.policy,
          result: 'success',
        })
      );
      events.push(
        makeAuditEvent(id, minutesAgo - 0.1, `Action selected: ${analysis.recommendedAction.replace(/_/g, ' ')}`, {
          result: 'success',
        })
      );
      // ~55% of "ready" actions have already resolved to recovered, to
      // populate a realistic historical dataset for KPI cards.
      const resolvedRoll = rng();
      if (resolvedRoll < 0.5 && analysis.recoveryProbability >= 50) {
        txn.status = 'recovered';
        txn.recoveredAt = new Date(Date.now() - randFloat(rng, 0.5, minutesAgo * 0.8) * 60 * 1000).toISOString();
        events.push(makeAuditEvent(id, minutesAgo * 0.2, 'Payment recovered', { result: 'recovered', actor: 'razorpay' }));
      } else if (resolvedRoll < 0.62) {
        txn.status = 'in_progress';
      } else {
        txn.status = 'ready';
      }
    } else if (decision.outcome === 'escalate' || decision.outcome === 'require_approval') {
      txn.status = 'escalated';
      txn.escalationReason = decision.reason;
      events.push(makeAuditEvent(id, minutesAgo - 0.08, 'Escalated to merchant operations', { decision: decision.reason, result: 'escalated' }));
    } else {
      txn.status = 'stopped';
      txn.escalationReason = decision.reason;
      events.push(makeAuditEvent(id, minutesAgo - 0.08, 'Action blocked / stopped', { decision: decision.reason, result: 'blocked' }));
    }

    txn.auditEvents = events;
    transactions.push(txn);
  }

  return transactions;
}
