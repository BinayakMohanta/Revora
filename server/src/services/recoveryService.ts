import { store } from '../data/store';
import { evaluatePolicy } from './policyEngine';
import { createPaymentLink } from './razorpayService';
import { ACTION_META } from '../agents/recoveryAgent';
import { AuditEvent, Transaction } from '../types';

function audit(txnId: string, event: string, extra: Partial<AuditEvent> = {}): AuditEvent {
  const e: AuditEvent = {
    id: `audit_${txnId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    transactionId: txnId,
    event,
    actor: 'agent',
    result: 'info',
    ...extra,
  };
  store.addAudit(e);
  return e;
}

export interface ExecuteResult {
  ok: boolean;
  transaction: Transaction;
  message: string;
  blocked?: boolean;
  policyChecks: ReturnType<typeof evaluatePolicy>['checks'];
}

export async function executeRecovery(txnId: string): Promise<ExecuteResult> {
  const txn = store.getTransaction(txnId);
  if (!txn) throw new Error('Transaction not found');

  const decision = evaluatePolicy(txn, store.settings);
  txn.policyChecks = decision.checks;

  if (decision.outcome !== 'allow') {
    audit(txnId, 'Action blocked', {
      decision: decision.reason,
      policy: decision.outcome,
      result: 'blocked',
    });
    if (decision.outcome === 'escalate' || decision.outcome === 'require_approval') {
      txn.status = 'escalated';
      txn.escalationReason = decision.reason;
      audit(txnId, 'Escalated to merchant operations', { decision: decision.reason, result: 'escalated' });
    } else {
      txn.status = 'stopped';
      txn.escalationReason = decision.reason;
      audit(txnId, 'Recovery stopped by policy engine', { decision: decision.reason, result: 'stopped' });
    }
    return { ok: false, blocked: true, transaction: txn, message: decision.reason, policyChecks: decision.checks };
  }

  audit(txnId, 'Policy check: PASSED', { result: 'success' });
  txn.status = 'in_progress';
  audit(txnId, `Action executed: ${ACTION_META[txn.recommendedAction].reason}`, { result: 'success' });

  if (txn.recommendedAction === 'payment_link' || txn.recommendedAction === 'retry_payment') {
    const link = await createPaymentLink(txn.amount, txn.customerName, txn.customerEmail, `Recovery for ${txn.id}`);
    txn.paymentLinkId = link.id;
    audit(txnId, `Payment link generated (${link.mode.toUpperCase()} mode)`, { actor: 'razorpay', result: 'info' });
  }

  txn.retryCount += 1;
  txn.nextActionAt = new Date(Date.now() + store.settings.cooldownMinutes * 60 * 1000).toISOString();

  // Deterministic outcome: recovery succeeds if probability clears the bar,
  // giving predictable, explainable demo behaviour rather than randomness.
  const recovers = txn.recoveryProbability >= 55;

  if (recovers) {
    txn.status = 'recovered';
    txn.recoveredAt = new Date().toISOString();
    audit(txnId, 'Payment recovered', { actor: 'razorpay', result: 'recovered' });
    return { ok: true, transaction: txn, message: 'Payment recovered successfully.', policyChecks: decision.checks };
  }

  if (txn.contactCount + 1 >= txn.maxContacts) {
    txn.status = 'escalated';
    txn.escalationReason = 'Recovery attempt did not convert and contact limit reached.';
    audit(txnId, 'Escalated after unsuccessful recovery attempt', { result: 'escalated' });
    return { ok: true, transaction: txn, message: 'Recovery attempt unsuccessful — escalated to human review.', policyChecks: decision.checks };
  }

  txn.contactCount += 1;
  txn.status = 'pending';
  audit(txnId, 'Recovery attempt in progress — awaiting customer action', { result: 'info' });
  return { ok: true, transaction: txn, message: 'Recovery action executed. Awaiting customer response.', policyChecks: decision.checks };
}

export function pauseRecovery(txnId: string): Transaction {
  const txn = store.getTransaction(txnId);
  if (!txn) throw new Error('Transaction not found');
  txn.status = 'pending';
  audit(txnId, 'Recovery paused by merchant', { actor: 'merchant', result: 'info' });
  return txn;
}

export function escalateRecovery(txnId: string, reason?: string): Transaction {
  const txn = store.getTransaction(txnId);
  if (!txn) throw new Error('Transaction not found');
  txn.status = 'escalated';
  txn.escalationReason = reason || 'Manually escalated by merchant.';
  audit(txnId, 'Escalated to merchant operations', { actor: 'merchant', decision: txn.escalationReason, result: 'escalated' });
  return txn;
}

export interface SimulationConfig {
  batchSize: number;
  failureMix: string[];
  maxRetries: number;
  minRecoveryProbability: number;
  maxContacts: number;
  highValueThreshold: number;
}

export interface SimulationStepResult {
  transaction: Transaction;
  outcome: 'recovered' | 'escalated' | 'stopped' | 'pending';
}

export async function runSimulationBatch(config: SimulationConfig): Promise<SimulationStepResult[]> {
  const pool = store.transactions
    .filter((t) => config.failureMix.length === 0 || config.failureMix.includes(t.failureReason))
    .slice(0, config.batchSize);

  const results: SimulationStepResult[] = [];

  const tempPolicy = {
    ...store.settings,
    maxRetries: config.maxRetries,
    minRecoveryProbability: config.minRecoveryProbability,
    maxContacts: config.maxContacts,
    highValueThreshold: config.highValueThreshold,
  };

  for (const txn of pool) {
    const decision = evaluatePolicy(txn, tempPolicy);
    txn.policyChecks = decision.checks;

    if (decision.outcome === 'allow') {
      const recovers = txn.recoveryProbability >= config.minRecoveryProbability + 5;
      if (recovers) {
        txn.status = 'recovered';
        txn.recoveredAt = new Date().toISOString();
        audit(txn.id, 'Payment recovered (simulation)', { result: 'recovered' });
        results.push({ transaction: txn, outcome: 'recovered' });
      } else {
        txn.status = 'pending';
        audit(txn.id, 'Recovery pending customer action (simulation)', { result: 'info' });
        results.push({ transaction: txn, outcome: 'pending' });
      }
    } else if (decision.outcome === 'escalate' || decision.outcome === 'require_approval') {
      txn.status = 'escalated';
      txn.escalationReason = decision.reason;
      audit(txn.id, 'Escalated (simulation)', { decision: decision.reason, result: 'escalated' });
      results.push({ transaction: txn, outcome: 'escalated' });
    } else {
      txn.status = 'stopped';
      txn.escalationReason = decision.reason;
      audit(txn.id, 'Stopped by policy (simulation)', { decision: decision.reason, result: 'stopped' });
      results.push({ transaction: txn, outcome: 'stopped' });
    }
  }

  return results;
}
