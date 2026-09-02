import { FailureReason, RecommendedAction, RiskLevel } from '../types';

export interface AgentInput {
  amount: number;
  failureReason: FailureReason;
  customerValue: number;
  previousSuccessfulPayments: number;
  previousFailures: number;
  retryCount: number;
  contactCount: number;
  highValueThreshold: number;
}

export interface AgentOutput {
  diagnosis: string;
  confidence: number;
  recoveryProbability: number;
  recommendedAction: RecommendedAction;
  expectedRecoveryValue: number;
  reasoning: string[];
  riskLevel: RiskLevel;
}

const DIAGNOSIS_MAP: Record<FailureReason, string> = {
  bank_decline: 'Likely temporary issuer-side decline.',
  insufficient_funds: 'Customer had insufficient balance at time of charge.',
  expired_card: "Customer's saved payment method has expired.",
  checkout_abandonment: 'Customer abandoned checkout before completing payment.',
  subscription_failure: 'Recurring subscription charge failed on renewal.',
};

const BASE_PROBABILITY: Record<FailureReason, number> = {
  bank_decline: 0.72,
  insufficient_funds: 0.55,
  expired_card: 0.8,
  checkout_abandonment: 0.4,
  subscription_failure: 0.5,
};

/**
 * Deterministic, fully-explainable recovery-probability model.
 * No randomness here — same input always produces same output, so every
 * number shown in the UI can be traced back to the underlying transaction.
 */
export function analyzeTransaction(input: AgentInput): AgentOutput {
  const {
    amount,
    failureReason,
    customerValue,
    previousSuccessfulPayments,
    previousFailures,
    retryCount,
    contactCount,
    highValueThreshold,
  } = input;

  let probability = BASE_PROBABILITY[failureReason];
  const reasoning: string[] = [];

  // Positive signal: loyal, previously-successful customers recover better.
  if (previousSuccessfulPayments > 0) {
    const boost = Math.min(previousSuccessfulPayments * 0.03, 0.15);
    probability += boost;
    reasoning.push(`${previousSuccessfulPayments} previous successful payment${previousSuccessfulPayments > 1 ? 's' : ''}`);
  } else {
    probability -= 0.05;
    reasoning.push('No prior successful payment history');
  }

  // Negative signal: repeat failures reduce confidence in recovery.
  if (previousFailures > 1) {
    const penalty = Math.min((previousFailures - 1) * 0.05, 0.2);
    probability -= penalty;
    reasoning.push(`${previousFailures} previous failures on record`);
  }

  // Retry count already used up reduces remaining upside.
  if (retryCount > 0) {
    probability -= retryCount * 0.06;
    reasoning.push(`${retryCount} retr${retryCount > 1 ? 'ies' : 'y'} already attempted`);
  }

  // Contact fatigue: repeated outreach lowers responsiveness.
  if (contactCount > 0) {
    probability -= contactCount * 0.04;
    reasoning.push(`${contactCount} previous customer contact${contactCount > 1 ? 's' : ''}`);
  }

  // High value transactions are diagnosed with extra caution.
  const isHighValue = amount > highValueThreshold;
  if (isHighValue) {
    probability -= 0.05;
    reasoning.push(`High-value transaction (> ₹${highValueThreshold.toLocaleString('en-IN')})`);
  }

  // Customer lifetime value nudges probability — high-LTV customers are
  // more likely to complete a recovery flow (they've done it before).
  if (customerValue > 20000) {
    probability += 0.04;
    reasoning.push('High customer lifetime value');
  }

  probability = Math.max(0.03, Math.min(0.97, probability));
  reasoning.push(`Recovery probability above threshold: ${probability >= 0.5 ? 'yes' : 'no'}`);

  // --- Recommended action ---
  let recommendedAction: RecommendedAction = 'stop';
  let riskLevel: RiskLevel = 'low';

  if (previousFailures >= 3 && probability < 0.3) {
    recommendedAction = 'escalate';
    riskLevel = 'high';
  } else if (failureReason === 'expired_card') {
    recommendedAction = 'update_payment_method';
    riskLevel = 'low';
  } else if (failureReason === 'checkout_abandonment') {
    recommendedAction = 'recovery_reminder';
    riskLevel = 'low';
  } else if (failureReason === 'insufficient_funds') {
    recommendedAction = 'retry_later';
    riskLevel = 'medium';
  } else if (failureReason === 'bank_decline') {
    recommendedAction = probability >= 0.7 ? 'payment_link' : 'retry_payment';
    riskLevel = probability >= 0.7 ? 'low' : 'medium';
  } else if (failureReason === 'subscription_failure') {
    recommendedAction = probability >= 0.6 ? 'payment_link' : 'retry_later';
    riskLevel = 'medium';
  }

  if (isHighValue) {
    riskLevel = 'high';
  }
  if (probability < 0.2) {
    recommendedAction = 'stop';
    riskLevel = 'high';
  }

  const confidence = Math.round(Math.min(96, 60 + previousSuccessfulPayments * 4 + (previousFailures === 0 ? 10 : 0)));
  const expectedRecoveryValue = Math.round(amount * probability);

  return {
    diagnosis: DIAGNOSIS_MAP[failureReason],
    confidence,
    recoveryProbability: Math.round(probability * 100),
    recommendedAction,
    expectedRecoveryValue,
    reasoning,
    riskLevel,
  };
}

export const ACTION_LABELS: Record<RecommendedAction, string> = {
  payment_link: 'Payment Link',
  retry_payment: 'Retry Payment',
  retry_later: 'Retry in 12h',
  update_payment_method: 'Update Payment Method',
  recovery_reminder: 'Recovery Reminder',
  escalate: 'Escalate',
  stop: 'Stop',
};

export const ACTION_META: Record<RecommendedAction, { risk: RiskLevel; policy: string; cooldownMinutes: number; maxAttempts: number; reason: string }> = {
  payment_link: {
    risk: 'low',
    policy: 'Allowed when recovery probability > 70% and retry limit not exceeded.',
    cooldownMinutes: 60,
    maxAttempts: 2,
    reason: 'Generates a hosted Razorpay payment link and sends it to the customer.',
  },
  retry_payment: {
    risk: 'medium',
    policy: 'Allowed when retry count is below merchant-defined maximum.',
    cooldownMinutes: 30,
    maxAttempts: 3,
    reason: 'Re-attempts the charge against the same payment instrument.',
  },
  retry_later: {
    risk: 'medium',
    policy: 'Scheduled retry after a cooldown window to allow balance replenishment.',
    cooldownMinutes: 720,
    maxAttempts: 2,
    reason: 'Delays retry to increase odds of sufficient balance.',
  },
  update_payment_method: {
    risk: 'low',
    policy: 'Allowed for expired/invalid instruments; requires customer action.',
    cooldownMinutes: 1440,
    maxAttempts: 2,
    reason: 'Prompts customer to update their saved payment method.',
  },
  recovery_reminder: {
    risk: 'low',
    policy: 'Allowed up to merchant-defined max contact attempts.',
    cooldownMinutes: 1440,
    maxAttempts: 3,
    reason: 'Sends a reminder notification to complete an abandoned checkout.',
  },
  escalate: {
    risk: 'high',
    policy: 'Triggered when automated recovery is unsafe or limits are exceeded.',
    cooldownMinutes: 0,
    maxAttempts: 1,
    reason: 'Hands off to merchant operations team for manual handling.',
  },
  stop: {
    risk: 'high',
    policy: 'Triggered when recovery probability is too low or transaction is unsafe to touch.',
    cooldownMinutes: 0,
    maxAttempts: 0,
    reason: 'Agent takes no further action to avoid unsafe or wasteful attempts.',
  },
};
