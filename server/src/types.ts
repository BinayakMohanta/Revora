export type FailureReason =
  | 'bank_decline'
  | 'insufficient_funds'
  | 'expired_card'
  | 'checkout_abandonment'
  | 'subscription_failure';

export type RecommendedAction =
  | 'payment_link'
  | 'retry_payment'
  | 'retry_later'
  | 'update_payment_method'
  | 'recovery_reminder'
  | 'escalate'
  | 'stop';

export type RiskLevel = 'low' | 'medium' | 'high';

export type TxnStatus =
  | 'failed'
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'recovered'
  | 'escalated'
  | 'stopped';

export interface AuditEvent {
  id: string;
  timestamp: string;
  transactionId: string;
  event: string;
  decision?: string;
  policy?: string;
  actor: 'agent' | 'system' | 'merchant' | 'razorpay';
  result: 'success' | 'blocked' | 'info' | 'escalated' | 'recovered' | 'stopped';
}

export interface PolicyCheck {
  label: string;
  passed: boolean;
}

export interface Transaction {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: 'INR';
  createdAt: string;
  status: TxnStatus;
  failureReason: FailureReason;
  failureCode: string;
  customerValue: number;
  previousSuccessfulPayments: number;
  previousFailures: number;
  lastSuccessfulPayment: string | null;
  recoveryProbability: number;
  expectedRecoveryValue: number;
  recommendedAction: RecommendedAction;
  actionRisk: RiskLevel;
  retryCount: number;
  maxRetries: number;
  contactCount: number;
  maxContacts: number;
  nextActionAt: string | null;
  escalationReason: string | null;
  diagnosis: string;
  confidence: number;
  reasoning: string[];
  policyChecks: PolicyCheck[];
  auditEvents: AuditEvent[];
  paymentLinkId?: string;
  recoveredAt?: string | null;
}

export interface RecoveryPolicySettings {
  maxRetries: number;
  maxContacts: number;
  minRecoveryProbability: number;
  highValueThreshold: number;
  cooldownMinutes: number;
  autonomousMode: boolean;
  requireApprovalHighValue: boolean;
  auditLogging: boolean;
  demoMode: boolean;
}

export interface AIProviderSettings {
  razorpayKeyId: string;
  razorpaySecretMasked: string;
  aiProvider: 'demo' | 'openai' | 'anthropic';
  aiKeyMasked: string;
}
